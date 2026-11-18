const $ = id => document.getElementById(id);
let previewUrl = null;
function notify(message, success=false) { $('toast').textContent=message;$('toast').className='toast'+(success?' success':''); }
function view(me) { $('loginPanel').hidden=!!me;$('uploadPanel').hidden=!me;if(me)$('accountLine').textContent=`Đang kết nối: ${me.displayName || me.email}`; }
async function api(path, options={}) { const r=await fetch('/api'+path,{credentials:'same-origin',...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Yêu cầu thất bại');return data; }
async function init(){try{const me=await api('/me');view(me);}catch{view(null);}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();notify('');const b=$('loginBtn');b.disabled=true;b.firstChild.textContent='Đang kết nối... ';try{const f=new FormData(e.currentTarget);const me=await api('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.get('email'),password:f.get('password')})});e.currentTarget.reset();view(me);notify('Đã đăng nhập thành công.',true);}catch(err){notify(err.message);}finally{b.disabled=false;b.firstChild.textContent='Kết nối tài khoản ';}});
$('logoutBtn').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'});view(null);notify('Đã đăng xuất.',true);}catch(err){notify(err.message);}});
$('caption').addEventListener('input',()=>{$('count').textContent=`${$('caption').value.length} / 250 ký tự`;});
function preview(file){if(previewUrl)URL.revokeObjectURL(previewUrl);if(!file){$('preview').hidden=true;$('emptyUpload').hidden=false;return;}if(file.size>4*1024*1024){notify('Ảnh tối đa 4 MB');$('photoInput').value='';return;}previewUrl=URL.createObjectURL(file);$('preview').src=previewUrl;$('preview').hidden=false;$('emptyUpload').hidden=true;notify('');}
$('photoInput').addEventListener('change',e=>preview(e.target.files[0]));
const drop=$('dropZone');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag');});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');const file=e.dataTransfer.files[0];if(!file)return;try{const dt=new DataTransfer();dt.items.add(file);$('photoInput').files=dt.files;preview(file);}catch{notify('Không thể kéo thả trên trình duyệt này, hãy bấm để chọn ảnh.');}});
$('postForm').addEventListener('submit',async e=>{e.preventDefault();notify('');const b=$('postBtn');b.disabled=true;b.firstChild.textContent='Đang đăng... ';try{const f=new FormData(e.currentTarget);f.set('confirmAll',$('confirmAll').checked?'yes':'no');const result=await api('/post',{method:'POST',body:f});notify(`Đã gửi khoảnh khắc thành công${result.moment_uid?' · '+result.moment_uid:''}.`,true);;e.target.reset();preview(null);$('count').textContent='0 / 250 ký tự';}catch(err){notify(err.message);}finally{b.disabled=false;b.firstChild.textContent='Đăng khoảnh khắc ';}});
init();
