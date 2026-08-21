// ==========================================
// 1. IMPORT THREE.JS & FIREBASE
// ==========================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 2. FIREBASE AUTHENTICATION
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const appState = {
    isLoggedIn: false,
    user: null,
    userCredits: 10,
    currentTab: 'generate',
    currentQuality: 'FHD',
    costs: { FHD: 2, '4K': 4 }
};

async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول عبر Firebase:", error);
        alert("حدث خطأ أثناء فتح نافذة Google: " + error.message);
    }
}

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

function checkAuthAndExecute(actionCallback) {
    if (!appState.isLoggedIn) {
        alert('عفواً! يجب تسجيل الدخول بجوجل أولاً لتتمكن من استخدام الاستوديو.');
        handleGoogleLogin();
        return false;
    }
    
    const requiredCost = appState.currentTab === 'avatar' 
        ? appState.costs[appState.currentQuality] * 2 
        : appState.costs[appState.currentQuality];

    if (appState.userCredits < requiredCost) {
        alert(`رصيدك غير كافٍ. تحتاج إلى ${requiredCost} نقاط ورصيدك الحالي ${appState.userCredits} نقاط فقط.`);
        return false;
    }

    actionCallback(requiredCost);
    return true;
}

// ==========================================
// 3. CINEMATIC THREE.JS BLACK HOLE ENGINE
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 28);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true, 
    powerPreference: "high-performance",
    alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// الثقب الأسود المركز (Black Sphere)
const blackHoleGroup = new THREE.Group();
scene.add(blackHoleGroup);

const bhRadius = 3.2;
const bhGeo = new THREE.SphereGeometry(bhRadius, 64, 64);
const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHoleMesh = new THREE.Mesh(bhGeo, bhMat);
blackHoleGroup.add(blackHoleMesh);

// هالة التوهج الذهبي حول الثقب (Aura Layer)
const auraMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.5);
            vec3 color = mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.9, 0.6), rim);
            gl_FragColor = vec4(color * rim * 3.0, rim);
        }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending
});
blackHoleGroup.add(new THREE.Mesh(new THREE.SphereGeometry(bhRadius * 1.06, 64, 64), auraMat));

// ==========================================
// 4. HIGH DENSITY ACCRETION DISK (15,000 FINE PARTICLES)
// ==========================================
const particleCount = 15000;
const particleGeo = new THREE.BufferGeometry();

const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const scales = new Float32Array(particleCount);
const orbitData = new Float32Array(particleCount * 3); // radius, speed, initialAngle

const colorInner = new THREE.Color(0xffffff); // قلب أبيض ساطع
const colorMid = new THREE.Color(0xffaa22);   // ذهبي ومرجاني
const colorOuter = new THREE.Color(0xcc3300); // برتقالي محمر ناعم

for (let i = 0; i < particleCount; i++) {
    // توزيع الجسيمات قريبة جداً من الكرة
    const r = bhRadius * 1.08 + Math.pow(Math.random(), 2.2) * 16.0;
    const speed = (0.8 / Math.sqrt(r)) * (0.9 + Math.random() * 0.2);
    const angle = Math.random() * Math.PI * 2;

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * (0.6 / (r * 0.2));
    positions[i * 3 + 2] = Math.sin(angle) * r;

    // ألوان تدريجية دقيقة
    let mixRatio = (r - bhRadius) / 16.0;
    let finalColor = new THREE.Color();
    
    if (mixRatio < 0.25) {
        finalColor.lerpColors(colorInner, colorMid, mixRatio * 4.0);
    } else {
        finalColor.lerpColors(colorMid, colorOuter, (mixRatio - 0.25) * 1.33);
    }

    colors[i * 3] = finalColor.r;
    colors[i * 3 + 1] = finalColor.g;
    colors[i * 3 + 2] = finalColor.b;

    scales[i] = Math.random() * 0.08 + 0.02; // دبابيس ونقط صغيييرة جداً
    orbitData[i * 3] = r;
    orbitData[i * 3 + 1] = speed;
    orbitData[i * 3 + 2] = angle;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particleGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
particleGeo.setAttribute('aOrbit', new THREE.BufferAttribute(orbitData, 3));

// Texture دائري ناعم للجسيمات
const createParticleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
};

const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSpeedScale: { value: 1.0 },
        uTexture: { value: createParticleTexture() }
    },
    vertexShader: `
        attribute float aScale;
        attribute vec3 aOrbit;
        uniform float uTime;
        uniform float uSpeedScale;
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            
            float radius = aOrbit.x;
            float speed = aOrbit.y * uSpeedScale;
            float initialAngle = aOrbit.z;
            
            float currentAngle = initialAngle + uTime * speed;
            vec3 pos = position;
            pos.x = cos(currentAngle) * radius;
            pos.z = sin(currentAngle) * radius;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = aScale * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        
        void main() {
            vec4 tex = texture2D(uTexture, gl_PointCoord);
            gl_FragColor = vec4(vColor, tex.a * 0.85);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(particleGeo, diskMaterial);
scene.add(particleSystem);

// ==========================================
// 5. ANIMATION & RESPONSIVE RESIZE
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    
    diskMaterial.uniforms.uTime.value = time;
    blackHoleGroup.rotation.y = time * 0.05;
    
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ==========================================
// 6. INTRO TRANSITION (CLICK TO EXPLODE)
// ==========================================
const overlay = document.getElementById('blackhole-overlay');
const whiteCore = document.getElementById('white-core');
const whiteFlash = document.getElementById('white-flash');
let isClicked = false;

if (overlay) {
    overlay.addEventListener('click', () => {
        if (isClicked) return;
        isClicked = true;

        if (whiteCore) {
            whiteCore.style.opacity = '1';
            whiteCore.style.width = '16px';
            whiteCore.style.height = '16px';
        }

        // تسريع الدوران بالتدريج
        let speedBoost = 1.0;
        let accelerationInterval = setInterval(() => {
            speedBoost += 1.2;
            diskMaterial.uniforms.uSpeedScale.value = speedBoost;
        }, 40);

        // انفجار الإضاءة والتكبير
        setTimeout(() => {
            clearInterval(accelerationInterval);
            if (whiteCore) {
                whiteCore.style.transition = 'width 0.3s cubic-bezier(0.1, 0.9, 0.2, 1), height 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)';
                whiteCore.style.width = '300vw';
                whiteCore.style.height = '300vh';
            }
            document.body.classList.add('screen-shake');
        }, 500);

        // إخفاء الفضاء وإبراز الموقع
        setTimeout(() => {
            if (whiteFlash) whiteFlash.style.opacity = '1';
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                document.body.classList.remove('screen-shake');

                setTimeout(() => {
                    if (whiteFlash) whiteFlash.style.opacity = '0';
                }, 400);

            }, 400);
        }, 750);
    });
}

// ==========================================
// 7. STUDIO TABS & CONTROLS INTERACTION
// ==========================================
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

function setupFileUploads() {
    document.querySelectorAll('.upload-box').forEach(box => {
        if (box.querySelector('input[type="file"]')) return;
        
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

function initUIEvents() {
    const loginBtn = document.getElementById('btn-google-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleGoogleLogin);
    }

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

                alert(`تم خصم ${costDeducted} نقاط بنجاح! جاري تنفيذ طلبك.`);
            });
        });
    });

    setupFileUploads();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIEvents);
} else {
    initUIEvents();
}
