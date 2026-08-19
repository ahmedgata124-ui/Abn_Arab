// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
    authDomain: "abn-arab-ai.firebaseapp.com",
    projectId: "abn-arab-ai",
    storageBucket: "abn-arab-ai.firebasestorage.app",
    messagingSenderId: "863813080286",
    appId: "1:863813080286:web:5fd4e1d46380992fdede4f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let credits = localStorage.getItem('abn_credits') ? parseInt(localStorage.getItem('abn_credits')) : 5;
document.getElementById('credits-count').innerText = credits;
let uploadedImageBase64 = null;

function loginGoogle() {
    auth.signInWithPopup(provider)
        .then(() => alert("تم تسجيل الدخول بنجاح!"))
        .catch(e => alert(e.message));
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
    
    if(tab === 'generate') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('panel-generate').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('panel-edit').classList.add('active');
    }
}

async function translateText(text) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`);
        const data = await res.json();
        return data.responseData.translatedText || text;
    } catch {
        return text;
    }
}

async function generateImage() {
    if (credits <= 0) return alert("نفذت محاولاتك المجانية! اشترك بالباقة الاحترافية للمتابعة.");
    const prompt = document.getElementById('gen-prompt').value.trim();
    if (!prompt) return alert("يرجى كتابة الوصف أولاً.");

    showLoading();
    const translated = await translateText(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(translated)}?width=512&height=512&seed=${seed}&model=flux-schnell&nologo=true`;

    displayResult(imgUrl);
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageBase64 = event.target.result;
            document.getElementById('preview-area').innerHTML = `<img src="${uploadedImageBase64}">`;
        };
        reader.readAsDataURL(file);
    }
}

async function editUploadedImage() {
    if (credits <= 0) return alert("نفذت محاولاتك المجانية!");
    if (!uploadedImageBase64) return alert("يرجى رفع صورة أولاً للتعديل عليها.");
    const editPrompt = document.getElementById('edit-prompt').value.trim();
    if (!editPrompt) return alert("يرجى كتابة التعديل المطلوب.");

    showLoading();
    const translated = await translateText(editPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(translated)}?width=512&height=512&seed=${seed}&model=flux&nologo=true`;

    displayResult(imgUrl);
}

function showLoading() {
    document.getElementById('preview-area').innerHTML = `
        <div style="color: var(--primary-glow);">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px;">جاري المعالجة والتوليد...</p>
        </div>`;
}

function displayResult(url) {
    const img = new Image();
    img.src = url;
    img.onload = () => {
        document.getElementById('preview-area').innerHTML = `<img src="${url}">`;
        useCredit();
    };
    img.onerror = () => {
        document.getElementById('preview-area').innerHTML = `<span style="color:red;">حدث خطأ أثناء معالجة الصورة، حاول مرة أخرى.</span>`;
    };
}

function useCredit() {
    credits--;
    localStorage.setItem('abn_credits', credits);
    document.getElementById('credits-count').innerText = credits;
}
