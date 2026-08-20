// 1. استيراد مكتبات Firebase Auth الحديثة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. إعدادات مشروع Firebase الخاص بك
const firebaseConfig = {
  apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
  authDomain: "abn-arab-ai.firebaseapp.com",
  projectId: "abn-arab-ai",
  storageBucket: "abn-arab-ai.firebasestorage.app",
  messagingSenderId: "863813080286",
  appId: "1:863813080286:web:5fd4e1d46380992fdede4f",
  measurementId: "G-XYNDV35VB2"
};

// 3. تهيئة Firebase و Google Provider
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 4. حالة النظام العامة (App State)
const appState = {
    isLoggedIn: false,
    user: null,
    userCredits: 10, // 10 نقاط تجربة مجانية
    currentTab: 'generate',
    currentQuality: 'FHD',
    costs: { FHD: 2, '4K': 4 }
};

// 5. دالة تسجيل الدخول بجوجل الحقيقية (Window Global Access)
window.loginWithGoogle = async function() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول عبر Firebase:", error);
        alert("تعذر فتح نافذة تسجيل الدخول بجوجل، يرجى المحاولة مرة أخرى.");
    }
};

// 6. الاستماع التلقائي لحالة التسجيل وتحديث الزر
onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('btn-google-login');
    if (user) {
        appState.isLoggedIn = true;
        appState.user = user;

        if (loginBtn) {
            loginBtn.className = 'btn-primary';
            loginBtn.innerHTML = `
                <img src="${user.photoURL}" style="width:22px; height:22px; border-radius:50%; object-fit:cover;">
                <span>${user.displayName ? user.displayName.split(' ')[0] : 'المستخدم'}</span>
            `;
        }
    } else {
        appState.isLoggedIn = false;
        appState.user = null;

        if (loginBtn) {
            loginBtn.className = 'btn-secondary';
            loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> تسجيل الدخول بجوجل`;
        }
    }
});

// 7. حماية عمليات التوليد والتحميل بشرط التسجيل والرصيد
function checkAuthAndExecute(actionCallback) {
    if (!appState.isLoggedIn) {
        alert('عفواً! يجب تسجيل الدخول بجوجل أولاً لتتمكن من استخدام الاستوديو.');
        window.loginWithGoogle();
        return false;
    }
    
    const requiredCost = appState.currentTab === 'avatar' 
        ? appState.costs[appState.currentQuality] * 2 
        : appState.costs[appState.currentQuality];

    if (appState.userCredits < requiredCost) {
        alert(`رصيدك غير كافٍ. تتطلب هذه العملية ${requiredCost} نقاط، ورصيدك المتبقي ${appState.userCredits} نقاط فقط.`);
        return false;
    }

    actionCallback(requiredCost);
    return true;
}

// 8. نظام التحكم بالتبويبات وتحديث التكلفة
function switchTab(tabName) {
    appState.currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`panel-${tabName}`);

    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedPanel) selectedPanel.classList.add('active');

    updateActionCost();
}

function setQuality(quality) {
    appState.currentQuality = quality;

    const btnFhd = document.getElementById('btn-fhd');
    const btn4k = document.getElementById('btn-4k');

    if (quality === 'FHD') {
        btnFhd?.classList.add('active');
        btn4k?.classList.remove('active');
    } else {
        btn4k?.classList.add('active');
        btnFhd?.classList.remove('active');
    }

    updateActionCost();
}

function updateActionCost() {
    const cost = appState.costs[appState.currentQuality];
    
    const generateBtn = document.querySelector('#panel-generate .btn-primary');
    if (generateBtn) {
        generateBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> توليد الصورة الآن (تستهلك ${cost} نقاط)`;
    }

    const avatarBtn = document.querySelector('#panel-avatar .btn-primary');
    if (avatarBtn) {
        avatarBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> إنشاء الأفاتار الناطق (تستهلك ${cost * 2} نقاط)`;
    }
}

// 9. تهيئة الأحداث المباشرة
document.addEventListener('DOMContentLoaded', () => {
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tabName = btn.getAttribute('data-tab');
        if (tabName) {
            btn.addEventListener('click', () => switchTab(tabName));
        }
    });

    document.getElementById('btn-fhd')?.addEventListener('click', () => setQuality('FHD'));
    document.getElementById('btn-4k')?.addEventListener('click', () => setQuality('4K'));

    document.querySelectorAll('.studio-panel-content .btn-primary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            checkAuthAndExecute((costDeducted) => {
                appState.userCredits -= costDeducted;
                
                const creditsBadge = document.getElementById('user-credits');
                if (creditsBadge) {
                    creditsBadge.innerText = `${appState.userCredits} نقاط متبقية`;
                }

                alert(`تم خصم ${costDeducted} نقاط بنجاح! جاري تنفيذ طلبك والتحميل.`);
            });
        });
    });

    setupFileUploads();
});

function setupFileUploads() {
    document.querySelectorAll('.upload-box').forEach(box => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*';
        fileInput.style.display = 'none';
        box.appendChild(fileInput);

        box.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const fileName = e.target.files[0].name;
                const textParagraph = box.querySelector('p');
                const icon = box.querySelector('i');

                if (textParagraph) textParagraph.textContent = `تم رفع: ${fileName}`;
                if (icon) {
                    icon.className = 'fa-solid fa-circle-check';
                    icon.style.color = 'var(--status-success)';
                }
            }
        });
    });
}
