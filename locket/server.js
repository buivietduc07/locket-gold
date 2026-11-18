import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCQngaaXQIfJaH0aS2l7REgIjD7nL431So';
const BUNDLE = 'com.locket.Locket';
const UA = 'FirebaseAuth.iOS/10.23.1 com.locket.Locket/1.82.0 iPhone/18.0 hw/iPhone12_1';
const BASE = 'https://api.locketcamera.com';
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/locket-img/o';
// Stateless, authenticated and encrypted cookies: no in-memory sessions on Vercel.
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.VERCEL ? '' : 'local-dev-only-not-for-production');
function sessionKey() {
  if (SESSION_SECRET.length < 32) throw new Error('Thiếu SESSION_SECRET (tối thiểu 32 ký tự) trong Vercel Environment Variables');
  return createHash('sha256').update(SESSION_SECRET).digest();
}
function seal(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
function unseal(value) {
  try {
    const buffer = Buffer.from(value,'base64url');
    if (buffer.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm',sessionKey(),buffer.subarray(0,12));
    decipher.setAuthTag(buffer.subarray(12,28));
    return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)),decipher.final()]).toString());
  } catch { return null; }
}

app.disable('x-powered-by');
app.set('trust proxy', PROD ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'blob:', 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
app.use(express.json({ limit: '24kb' }));
app.use(express.static('public'));
app.use('/api', rateLimit({windowMs: 60_000, limit: 30, standardHeaders:'draft-7', legacyHeaders:false}));
app.use('/api', (req, res, next) => {
  if (['POST','PUT','DELETE','PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({error:'Origin không hợp lệ'}); }
      catch {return res.status(403).json({error:'Origin không hợp lệ'});}
    }
  }
  next();
});

function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim()).filter(Boolean).map(x => { const i=x.indexOf('='); return [x.slice(0,i),x.slice(i+1)];})); }
function getSession(req) { const s=unseal(cookies(req).locket_sid || ''); return s && s.expires > Date.now() ? s : null; }
function setSession(res, data) {res.cookie('locket_sid',seal(data),{httpOnly:true,secure:PROD,sameSite:'strict',path:'/',maxAge:7*24*3600_000});}
function errMsg(obj) {return obj?.error?.message || obj?.result?.errors?.join(', ') || obj?.error_description || obj?.message || 'Lỗi không xác định';}
async function requestJson(url, options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(25_000)});
  const text=await response.text(); let data;
  try {data=JSON.parse(text);} catch {data={message:text.slice(0,240)};}
  if (!response.ok || data?.error || (data?.result?.status && data.result.status >= 400)) {
    const e=new Error(`${errMsg(data)} (HTTP ${response.status})`);e.status=502;throw e;
  }
  return data;
}
function authHeaders(token) {return {'Authorization':`Bearer ${token}`,'User-Agent':UA,'Content-Type':'application/json'};}
async function refresh(s) {
  if (Date.now() < s.tokenExpiry - 60_000) return s.idToken;
  const p=new URLSearchParams({grant_type:'refresh_token',refresh_token:s.refreshToken});
  const data=await requestJson(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p});
  s.idToken=data.id_token;s.refreshToken=data.refresh_token || s.refreshToken;s.tokenExpiry=Date.now()+Number(data.expires_in || 3600)*1000;
  return s.idToken;
}
async function signedIn(req,res) {const s=getSession(req);if(!s){res.status(401).json({error:'Bạn chưa đăng nhập'});return null;}return s;}
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

app.post('/api/login',wrap(async(req,res)=>{
  const email=String(req.body?.email || '').trim(); const password=String(req.body?.password || '');
  if (email.length > 254 || !email.includes('@') || !password || password.length>1024) return res.status(400).json({error:'Email hoặc mật khẩu không hợp lệ'});
  const data=await requestJson(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${API_KEY}`,{
    method:'POST',headers:{'Content-Type':'application/json','x-ios-bundle-identifier':BUNDLE,'User-Agent':UA},
    body:JSON.stringify({clientType:'CLIENT_TYPE_IOS',email,password,returnSecureToken:true})
  });
  setSession(res,{idToken:data.idToken,refreshToken:data.refreshToken,tokenExpiry:Date.now()+Number(data.expiresIn||3600)*1000,expires:Date.now()+7*24*3600_000,uid:data.localId,email:data.email || email,displayName:data.displayName || ''});res.json({ok:true,email:data.email || email,displayName:data.displayName || ''});
}));
app.get('/api/me',wrap(async(req,res)=>{
  const s=await signedIn(req,res);if (!s)return;
  res.json({email:s.email,displayName:s.displayName,uid:s.uid});
}));
app.post('/api/logout',(req,res)=>{res.clearCookie('locket_sid',{path:'/',sameSite:'strict',secure:PROD,httpOnly:true});res.json({ok:true});});

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:4*1024*1024,files:1},fileFilter(req,file,cb){cb(null,['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.mimetype));}});
app.post('/api/post',upload.single('photo'),wrap(async(req,res)=>{
  const s=await signedIn(req,res);if (!s)return;
  if (!req.file) return res.status(400).json({error:'Chọn ảnh JPG, PNG hoặc WebP tối đa 4 MB'});
  const caption=String(req.body?.caption || '').trim();
  if (caption.length>250) return res.status(400).json({error:'Caption tối đa 250 ký tự'});
  if (req.body?.confirmAll !== 'yes') return res.status(400).json({error:'Cần xác nhận gửi cho tất cả bạn bè'});
  const token=await refresh(s);
  setSession(res,s);
  const image=await sharp(req.file.buffer,{failOn:'error'}).rotate().resize(1080,1080,{fit:'cover'}).webp({quality:85}).toBuffer();
  if(image.length > 4*1024*1024) return res.status(400).json({error:'Ảnh sau xử lý vượt 4 MB'});
  const filename=`${randomUUID()}.webp`;
  const path=`users/${s.uid}/moments/thumbnails/${filename}`;
  const pathEncoded=encodeURIComponent(path);
  const startUrl=`${STORAGE}/${pathEncoded}?uploadType=resumable&name=${pathEncoded}`;
  const init=await fetch(startUrl,{method:'POST',signal:AbortSignal.timeout(25_000),headers:{
    'Authorization':`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8',
    'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start',
    'X-Goog-Upload-Content-Length':String(image.length),'X-Goog-Upload-Content-Type':'image/webp',
    'X-Firebase-Storage-Version':'ios/10.28.1','User-Agent':UA
  },body:JSON.stringify({name:path,contentType:'image/webp',bucket:'',metadata:{creator:s.uid,visibility:'private'}})});
  if(!init.ok) {const b=await init.text();throw new Error(`Khởi tạo upload thất bại (HTTP ${init.status}): ${b.slice(0,200)}`);}
  const sessionUrl=init.headers.get('x-goog-upload-url');
  if(!sessionUrl) throw new Error('Máy chủ không trả về X-Goog-Upload-URL. Giao thức có thể đã thay đổi.');
  const allowedSessionHost=new URL(sessionUrl).hostname;
  if(new URL(sessionUrl).protocol !== 'https:' || !allowedSessionHost.endsWith('.googleapis.com')) throw new Error('URL phiên upload không hợp lệ');
  const put=await fetch(sessionUrl,{method:'PUT',signal:AbortSignal.timeout(40_000),headers:{
    'Content-Type':'application/octet-stream','X-Goog-Upload-Protocol':'resumable',
    'X-Goog-Upload-Command':'upload, finalize','X-Goog-Upload-Offset':'0'
  },body:image});
  if(!put.ok){const b=await put.text();throw new Error(`Upload thất bại (HTTP ${put.status}): ${b.slice(0,200)}`);}
  const metadata=await requestJson(`${STORAGE}/${pathEncoded}`,{headers:authHeaders(token)});
  const downloadToken=String(metadata.downloadTokens || '').split(',')[0];
  if(!downloadToken)throw new Error('Không có downloadTokens trong metadata ảnh');
  const photoUrl=`${STORAGE}/${pathEncoded}?alt=media&token=${encodeURIComponent(downloadToken)}`;
  const overlays=caption?[{overlay_id:'caption:standard',overlay_type:'caption',data:{text_color:'#FFFFFFE6',text:caption,type:'standard',max_lines:4,background:{colors:[],material_blur:'ultra-thin'}},alt_text:caption}]:[];
  const payload={data:{thumbnail_url:photoUrl,caption,...(caption?{}:{}),recipients:[],overlays}};
  const result=await requestJson(`${BASE}/postMomentV2`,{method:'POST',headers:authHeaders(token),body:JSON.stringify(payload)});
  res.json({ok:true,moment_uid:result?.result?.moment_uid || null});
}));
app.use((error,req,res,next)=>{
  const status=error instanceof multer.MulterError ? 400 : error.status || 500;
  const message=error instanceof multer.MulterError ? 'Ảnh vượt giới hạn 4 MB hoặc tải lên không hợp lệ' : error.message || 'Lỗi máy chủ';
  // Avoid leaking tokens/secret URLs returned by upstream errors.
  res.status(status).json({error:message.replace(/token=[^\s&]+/gi,'token=[hidden]').slice(0,300)});
});
if (!process.env.VERCEL) app.listen(PORT,()=>console.log(`Locket web: http://localhost:${PORT}`));
export default app;
