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
// 3. THREE.JS CINEMATIC BLACK HOLE SCENE
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.012);

// كاميرا سينمائية بزاوية مائلة لإبراز العمق الحقيقي للقرص
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 9.5, 24);
camera.lookAt(0, -0.5, 0);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// حاوية تجميع تُمنح ميلاً ثابتاً لكل عناصر الثقب الأسود والقرص
// لخلق عمق ثلاثي الأبعاد حقيقي بدلاً من دوائر مسطحة
const blackHoleGroup = new THREE.Group();
blackHoleGroup.rotation.x = THREE.MathUtils.degToRad(-18);
scene.add(blackHoleGroup);

// ---------- خلفية نجمية بعيدة لإحساس أعمق بالكون ----------
function createStarfield() {
    const starCount = 3500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        const radius = 120 + Math.random() * 260;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xbcd4ff,
        size: 0.55,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(starGeo, starMat));
}
createStarfield();

// ---------- الثقب الأسود المركزي (أفق الحدث) ----------
const bhRadius = 2.8;
const bhGeo = new THREE.SphereGeometry(bhRadius, 96, 96);
const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHoleMesh = new THREE.Mesh(bhGeo, bhMat);
blackHoleGroup.add(blackHoleMesh);

// هالة ناعمة تحيط بأفق الحدث تحاكي انحناء الضوء دون أي حواف بيضاء حادة
const eventHorizonGlowMat = new THREE.ShaderMaterial({
    uniforms: {
        uColorInner: { value: new THREE.Color(0xfff4d6) },
        uColorOuter: { value: new THREE.Color(0xff7a1a) }
    },
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
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
            vec3 col = mix(uColorInner, uColorOuter, rim);
            // انحسار ناعم جداً بدل الحافة الحادة
            float softness = smoothstep(0.0, 1.0, rim);
            gl_FragColor = vec4(col * softness * 1.6, softness * 0.85);
        }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});
blackHoleGroup.add(new THREE.Mesh(new THREE.SphereGeometry(bhRadius * 1.18, 96, 96), eventHorizonGlowMat));

// طبقة توهج خارجية إضافية أوسع وأخفت (تحاكي bloom بدون post-processing)
const outerBloomMat = eventHorizonGlowMat.clone();
outerBloomMat.uniforms = {
    uColorInner: { value: new THREE.Color(0xffcf8a) },
    uColorOuter: { value: new THREE.Color(0x8a3dff) }
};
outerBloomMat.opacity = 0.35;
blackHoleGroup.add(new THREE.Mesh(new THREE.SphereGeometry(bhRadius * 1.9, 64, 64), outerBloomMat));

// ==========================================
// 4. القرص التراكمي (ACCRETION DISK) - تدرج لوني سينمائي
// ذهبي/أبيض متوهج -> برتقالي عميق -> أحمر نابض -> بنفسجي كوني -> نيلي داكن
// ==========================================
const streakCount = 6000;
const instancedGeo = new THREE.CylinderGeometry(0.02, 0.09, 1.4, 4);
instancedGeo.rotateX(Math.PI / 2);

const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSpeedScale: { value: 1.0 }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSpeedScale;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
            vec4 instMatrix = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float r = length(instMatrix.xz);
            float initialAngle = atan(instMatrix.z, instMatrix.x);

            float speed = (2.1 / sqrt(r)) * uSpeedScale;
            float angle = initialAngle + uTime * speed;

            vec3 worldPos = vec3(cos(angle) * r, instMatrix.y, sin(angle) * r);

            // تدرج ألوان سينمائي كامل من الداخل إلى الحافة الخارجية
            vec3 cWhiteGold = vec3(1.0, 0.97, 0.85);
            vec3 cAmber     = vec3(1.0, 0.62, 0.16);
            vec3 cRed       = vec3(0.95, 0.22, 0.16);
            vec3 cPurple    = vec3(0.55, 0.16, 0.85);
            vec3 cIndigo    = vec3(0.16, 0.08, 0.42);

            float normR = clamp((r - 3.0) / 15.0, 0.0, 1.0);

            vec3 finalColor;
            if (normR < 0.18) {
                finalColor = mix(cWhiteGold, cAmber, normR / 0.18);
            } else if (normR < 0.42) {
                finalColor = mix(cAmber, cRed, (normR - 0.18) / 0.24);
            } else if (normR < 0.7) {
                finalColor = mix(cRed, cPurple, (normR - 0.42) / 0.28);
            } else {
                finalColor = mix(cPurple, cIndigo, (normR - 0.7) / 0.3);
            }

            // الجسيمات الداخلية أكثر توهجاً، تخفت تدريجياً نحو الفراغ الكوني
            float glowBoost = mix(2.1, 0.55, normR);
            vColor = finalColor * glowBoost;

            vOpacity = smoothstep(2.9, 3.6, r) * (1.0 - smoothstep(15.5, 19.0, r));

            float deltaAngle = angle - initialAngle;
            float c = cos(deltaAngle); float s = sin(deltaAngle);
            mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);

            vec3 localPos = (instanceMatrix * vec4(position, 1.0)).xyz;
            vec3 transformed = rotY * localPos;

            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos + transformed, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            gl_FragColor = vec4(vColor, vOpacity);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const instancedMesh = new THREE.InstancedMesh(instancedGeo, diskMaterial, streakCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < streakCount; i++) {
    const r = 3.0 + Math.pow(Math.random(), 1.4) * 15.0;
    const angle = Math.random() * Math.PI * 2;

    dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 0.18, Math.sin(angle) * r);
    dummy.rotation.y = -angle;
    dummy.scale.set(1.0, 1.0, Math.random() * 1.6 + 0.5);
    dummy.updateMatrix();

    instancedMesh.setMatrixAt(i, dummy.matrix);
}
blackHoleGroup.add(instancedMesh);

// ==========================================
// 5. ANIMATION LOOP & RESPONSIVE RESIZE
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    diskMaterial.uniforms.uTime.value = time;
    blackHoleGroup.rotation.z = Math.sin(time * 0.03) * 0.02;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ==========================================
// 6. AUDIO ENGINEERING (Web Audio API)
//    - نبض/تشويش سينمائي هادئ للخلفية الكونية عبر LFO
//    - كتم فوري للخلفية + صوت انفجار عند النقر
//    - عودة تدريجية للخلفية بعد انتهاء الانتقال
// ==========================================
const overlay = document.getElementById('blackhole-overlay');
const whiteCore = document.getElementById('white-core');
const bgSpaceSound = document.getElementById('bg-space-sound');
const transitionSound = document.getElementById('transition-sound');

const BG_BASE_VOLUME = 0.4;
const STUTTER_DEPTH = 0.14;
const STUTTER_FREQ = 0.28; // هرتز - نبض بطيء وهادئ وليس تشويشاً حاداً

let audioCtx = null;
let duckGain = null;
let stutterGain = null;
let audioGraphReady = false;

function initAudioGraph() {
    if (audioGraphReady || !bgSpaceSound) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bgSource = audioCtx.createMediaElementSource(bgSpaceSound);

        // عقدة تتحكم بالنبض الجوي المستمر (Stutter/LFO)
        stutterGain = audioCtx.createGain();
        stutterGain.gain.value = BG_BASE_VOLUME;

        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = STUTTER_FREQ;

        const lfoDepth = audioCtx.createGain();
        lfoDepth.gain.value = STUTTER_DEPTH;

        lfo.connect(lfoDepth);
        lfoDepth.connect(stutterGain.gain);
        lfo.start();

        // عقدة منفصلة تتحكم فقط بالكتم الكامل أثناء الانفجار (Ducking)
        duckGain = audioCtx.createGain();
        duckGain.gain.value = 1;

        bgSource.connect(stutterGain).connect(duckGain).connect(audioCtx.destination);

        bgSpaceSound.volume = 1; // مستوى الصوت الفعلي يُتحكم به الآن عبر GainNode
        audioGraphReady = true;
    } catch (err) {
        console.warn('تعذر تهيئة Web Audio API، سيتم الاعتماد على الصوت الافتراضي.', err);
    }
}

const startBgAudio = () => {
    initAudioGraph();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    if (bgSpaceSound && bgSpaceSound.paused) {
        bgSpaceSound.play().catch(() => {});
    }
};
window.addEventListener('click', startBgAudio, { once: true });
window.addEventListener('touchstart', startBgAudio, { once: true });

// كتم فوري وسلس لصوت الخلفية عبر GainNode (وليس إيقافاً خشناً)
function duckBackgroundAudio() {
    if (!audioCtx || !duckGain) return;
    const now = audioCtx.currentTime;
    duckGain.gain.cancelScheduledValues(now);
    duckGain.gain.setValueAtTime(duckGain.gain.value, now);
    duckGain.gain.linearRampToValueAtTime(0.0001, now + 0.22);
}

// إعادة صعود الخلفية تدريجياً واستئناف النبض الجوي
function restoreBackgroundAudio() {
    if (!audioCtx || !duckGain) return;
    const now = audioCtx.currentTime;
    duckGain.gain.cancelScheduledValues(now);
    duckGain.gain.setValueAtTime(duckGain.gain.value, now);
    duckGain.gain.linearRampToValueAtTime(1.0, now + 1.6);
}

// تلاشي ناعم لصوت الانفجار بعد انتهاء دوره
function fadeOutTransitionSound() {
    if (!transitionSound) return;
    let fade = setInterval(() => {
        if (transitionSound.volume > 0.05) {
            transitionSound.volume = Math.max(0, transitionSound.volume - 0.05);
        } else {
            transitionSound.pause();
            transitionSound.volume = 0.9;
            clearInterval(fade);
        }
    }, 50);
}

let isClicked = false;

if (overlay) {
    overlay.addEventListener('click', () => {
        if (isClicked) return;
        isClicked = true;

        initAudioGraph();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        // 1. كتم كامل وفوري لصوت الخلفية الكونية ليأخذ الانفجار المساحة الصوتية بالكامل
        duckBackgroundAudio();

        // 2. تشغيل صوت الانفجار المرافق لتمدد الكرة البيضاء
        if (transitionSound) {
            transitionSound.currentTime = 0;
            transitionSound.volume = 0.9;
            transitionSound.play().catch(() => {});
        }

        // 3. توسيع الكرة البيضاء بالتدريج وبسرعة لتبتلع الشاشة
        if (whiteCore) {
            whiteCore.style.opacity = '1';
            whiteCore.style.width = '10px';
            whiteCore.style.height = '10px';

            document.body.classList.add('screen-shake');

            setTimeout(() => {
                whiteCore.style.width = '350vw';
                whiteCore.style.height = '350vh';
            }, 50);
        }

        // تسريع دوران القرص التراكمي أثناء الانتقال
        let speedBoost = 1.0;
        const accel = setInterval(() => {
            speedBoost += 1.5;
            diskMaterial.uniforms.uSpeedScale.value = speedBoost;
        }, 30);

        // اختفاء الانيميشن وعودة الشاشة العادية
        setTimeout(() => {
            clearInterval(accel);
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            document.body.classList.remove('screen-shake');

            // 4. إعادة صعود صوت الخلفية تدريجياً واستئناف النبض الجوي
            restoreBackgroundAudio();
            fadeOutTransitionSound();
        }, 650);
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
