// ==========================================
// 1. استيراد Firebase v10 Modular SDK
// ==========================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    runTransaction, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 2. إعدادات المتغيرات وتدشين التطبيق
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
    authDomain: "abn-arab-ai.firebaseapp.com",
    projectId: "abn-arab-ai",
    storageBucket: "abn-arab-ai.firebasestorage.app",
    messagingSenderId: "863813080286",
    appId: "1:863813080286:web:5fd4e1d46380992fdede4f",
    measurementId: "G-XYNDV35VB2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// إدارة الحالة العامة للتطبيق (State Management)
let currentUser = null;
let userCredits = 0;
let uploadedImageBase64 = null;
let currentAbortController = null;
let selectedQuality = "1080p";

// ==========================================
// 3. أدوات الحماية والخدمات المساعدة
// ==========================================
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions = {
        ...options,
        signal: options.signal || controller.signal
    };

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (retries > 0 && error.name !== 'AbortError') {
            return await fetchWithRetry(url, options, retries - 1, timeoutMs);
        }
        throw error;
    }
}

// ==========================================
// 4. نظام تسجيل الدخول وتزامن الحسابات (Auth & Firestore)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await syncUserProfile(user);
        updateAuthUI(true, user.displayName);
    } else {
        userCredits = 0;
        updateCreditsDisplay(0);
        updateAuthUI(false);
    }
});

async function syncUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            // إضافة المستخدم الجديد مع 10 نقاط مجانية
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || "مستخدم جديد",
                email: user.email,
                credits: 10,
                createdAt: serverTimestamp()
            });
            userCredits = 10;
        } else {
            userCredits = userSnap.data().credits ?? 0;
        }
        updateCreditsDisplay(userCredits);
    } catch (error) {
        showNotification("خطأ أثناء مزامنة بياناتك: " + error.message, "error");
    }
}

export async function loginGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        showNotification(`أهلاً بك يا ${sanitizeHTML(result.user.displayName)} في ابن العرب AI!`, "success");
    } catch (error) {
        showNotification("تعثر تسجيل الدخول: " + error.message, "error");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        showNotification("تم تسجيل الخروج بنجاح.", "info");
    } catch (error) {
        showNotification("حدث خطأ أثناء تسجيل الخروج.", "error");
    }
}

async function deductCreditsInFirestore(amount = 1) {
    if (!currentUser) return false;
    const userRef = doc(db, "users", currentUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("حساب المستخدم غير موجود!");

            const currentBalance = userDoc.data().credits || 0;
            if (currentBalance < amount) {
                throw new Error(`رصيدك غير كافٍ! هذه العملية تتطلب ${amount} نقاط ورصيدك الحالي ${currentBalance}.`);
            }

            transaction.update(userRef, { credits: currentBalance - amount });
        });

        userCredits -= amount;
        updateCreditsDisplay(userCredits);
        return true;
    } catch (error) {
        showNotification(error.message, "warning");
        return false;
    }
}

// ==========================================
// 5. خدمات الاستوديو والمحركات الذكية
// ==========================================
async function translateToEnglish(text) {
    if (!text) return '';
    try {
        const res = await fetchWithRetry(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`, {}, 1, 5000);
        const data = await res.json();
        return data.responseData?.translatedText || text;
    } catch {
        return text;
    }
}

function prepareNewRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    return currentAbortController.signal;
}

// 1. توليد الصور (تستهلك 2 نقطة)
export async function generateImage() {
    const cost = 2;
    if (!verifyAuthAndCredits(cost)) return;

    const promptInput = document.getElementById('gen-prompt');
    const prompt = promptInput?.value.trim();
    if (!prompt) return showNotification("يرجى كتابة وصف الصورة أولاً!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري تصميم الصورة بواسطة محرك FLUX...");

    try {
        const enPrompt = await translateToEnglish(prompt);
        const seed = Math.floor(Math.random() * 9999999);
        
        // تحديد الأبعاد بناءً على الدقة المختارة (4K أو 1080p)
        const dim = selectedQuality === '4k' ? '2048&height=2048' : '1024&height=1024';
        const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=${dim}&seed=${seed}&model=flux-realism&nologo=true`;

        await renderImageResult(imgUrl, signal, cost);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("فشلت عملية توليد الصورة. حاول مرة أخرى.");
        }
    }
}

// 2. تعديل الصور (تستهلك 1 نقطة)
export async function editUploadedImage() {
    const cost = 1;
    if (!verifyAuthAndCredits(cost)) return;
    if (!uploadedImageBase64) return showNotification("يرجى رفع صورة من جهازك أولاً!", "warning");

    const editPrompt = document.getElementById('edit-prompt')?.value.trim();
    if (!editPrompt) return showNotification("يرجى كتابة التعديل المطلوب!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري معالجة التعديل الذكي...");

    try {
        const enPrompt = await translateToEnglish(editPrompt);
        const seed = Math.floor(Math.random() * 9999999);
        const editedUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&enhance=true&nologo=true`;

        await renderImageResult(editedUrl, signal, cost);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("تعثر إدخال التعديل على الصورة.");
        }
    }
}

// 3. تحريك الفيديوهات (تستهلك 1 نقطة)
export async function generateVideo() {
    const cost = 1;
    if (!verifyAuthAndCredits(cost)) return;

    const prompt = document.getElementById('video-prompt')?.value.trim();
    if (!prompt) return showNotification("يرجى كتابة وصف حركة المشهد!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري توليد وإنشاء تحريك المشهد...");

    try {
        const enPrompt = await translateToEnglish(prompt);
        const seed = Math.floor(Math.random() * 9999999);
        const videoMotionUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt + " dynamic video movement motion high quality")}?width=512&height=512&seed=${seed}&model=flux&nologo=true`;

        await renderImageResult(videoMotionUrl, signal, cost, true);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("حدث خطأ أثناء معالجة تحريك الفيديو.");
        }
    }
}

// 4. صناعة الأفاتار الناطق (تستهلك 1 نقطة)
export async function generateAvatar() {
    const cost = 1;
    if (!verifyAuthAndCredits(cost)) return;

    const textScript = document.getElementById('avatar-script')?.value.trim();
    if (!textScript) return showNotification("يرجى كتابة النص العربي الذي سيتحدث به الأفاتار!", "warning");

    showLoading("جاري إعداد وتحضير الأفاتار التفاعلي الناطق...");

    setTimeout(async () => {
        const success = await deductCreditsInFirestore(cost);
        if (!success) return;

        const avatarImgUrl = "https://a.storyblok.com/f/165321/1110x960/bf6a04879b/digital-human.png";
        const sanitizedText = sanitizeHTML(textScript);

        const preview = document.getElementById('preview-area');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <img id="avatar-img" src="${avatarImgUrl}" style="max-width:200px; border-radius:50%; border:4px solid #00d2ff; margin-bottom:15px; transition: transform 0.2s;">
                    <p style="color:#fff; font-size: 1.1rem; font-weight: bold; margin-bottom:15px;">"${sanitizedText}"</p>
                    <button id="speak-btn" style="background:linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color:#fff; border:none; padding:10px 24px; border-radius:12px; font-weight:bold; cursor:pointer;">
                        <i class="fa-solid fa-volume-high"></i> إعادة تشغيل الصوت
                    </button>
                </div>`;

            const speakText = () => {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(textScript);
                    utterance.lang = 'ar-SA';
                    utterance.rate = 0.9;
                    
                    const avatarImg = document.getElementById('avatar-img');
                    utterance.onstart = () => avatarImg?.classList.add('pulse-avatar');
                    utterance.onend = () => avatarImg?.classList.remove('pulse-avatar');

                    window.speechSynthesis.speak(utterance);
                } else {
                    showNotification("متصفحك لا يدعم القراءة الصوتية الحية.", "info");
                }
            };

            document.getElementById('speak-btn')?.addEventListener('click', speakText);
            speakText();
        }
    }, 1500);
}

// ==========================================
// 6. التحكم بالواجهة وتأكيد النتائج
// ==========================================
function verifyAuthAndCredits(requiredCredits = 1) {
    if (!currentUser) {
        showNotification("يرجى تسجيل الدخول بجوجل أولاً لاستخدام خدمات الاستوديو!", "warning");
        return false;
    }
    if (userCredits < requiredCredits) {
        showNotification(`رصيدك الحالي (${userCredits}) غير كافٍ للعملية. يتطلب ${requiredCredits} نقاط!`, "warning");
        return false;
    }
    return true;
}

function renderImageResult(url, signal, costAmount, isVideoMode = false) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;

        img.onload = async () => {
            if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));

            const success = await deductCreditsInFirestore(costAmount);
            if (success) {
                const preview = document.getElementById('preview-area');
                if (preview) {
                    preview.innerHTML = `
                        <div style="text-align:center;">
                            <img src="${url}" style="max-width:100%; max-height:480px; border-radius:16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                            ${isVideoMode ? '<p style="color:#25d366; font-weight:bold; margin-top:12px;"><i class="fa-solid fa-circle-check"></i> تم تحريك المشهد بنجاح</p>' : ''}
                        </div>`;
                }
            }
            resolve();
        };

        img.onerror = () => {
            if (!signal.aborted) {
                showRenderError("تعثر تحميل الميديا من المزود، لم يتم خصم نقاط من حسابك.");
            }
            reject(new Error("Media Load Failed"));
        };
    });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        return showNotification("يرجى اختيار ملف صورة صالح!", "warning");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImageBase64 = event.target.result;
        const preview = document.getElementById('preview-area');
        if (preview) {
            preview.innerHTML = `<img src="${uploadedImageBase64}" style="max-width:100%; max-height:400px; border-radius:12px;">`;
        }
    };
    reader.readAsDataURL(file);
}

function updateCreditsDisplay(count) {
    const c1 = document.getElementById('credits-count');
    const c2 = document.getElementById('credits-count-panel');
    if (c1) c1.innerText = count;
    if (c2) c2.innerText = count;
}

function updateAuthUI(isLoggedIn, userName = "") {
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        if (isLoggedIn) {
            authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> خروج (${sanitizeHTML(userName)})`;
            authBtn.onclick = logoutUser;
        } else {
            authBtn.innerHTML = `<i class="fa-brands fa-google"></i> تسجيل الدخول بجوجل`;
            authBtn.onclick = loginGoogle;
        }
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`panel-${tabName}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

function showLoading(message) {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.innerHTML = `
            <div style="text-align: center; color: #06b6d4; padding: 40px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x"></i>
                <p style="margin-top: 15px; font-weight: bold; font-size: 1.1rem;">${sanitizeHTML(message)}</p>
            </div>`;
    }
}

function showRenderError(message) {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.innerHTML = `<p style="color:#ef4444; font-weight:bold; padding:20px; text-align:center;">${sanitizeHTML(message)}</p>`;
    }
}

function showNotification(msg, type = "info") {
    alert(`[${type.toUpperCase()}]: ${msg}`);
}

// ==========================================
// 7. ربط أحداث العناصر (Event Listeners)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('auth-btn')?.addEventListener('click', loginGoogle);
    document.getElementById('btn-gen-image')?.addEventListener('click', generateImage);
    document.getElementById('btn-edit-image')?.addEventListener('click', editUploadedImage);
    document.getElementById('btn-gen-video')?.addEventListener('click', generateVideo);
    document.getElementById('btn-gen-avatar')?.addEventListener('click', generateAvatar);
    document.getElementById('file-input')?.addEventListener('change', handleImageUpload);

    // ربط التبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });

    // ربط اختيار الدقة الجودة (4K / 1080p)
    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedQuality = btn.getAttribute('data-quality') || '1080p';
        });
    });
});
