//   Digital Bloom: A Fractal Garden by Kayla Eli, Jesse Xu, and Yubang Huang
let particles = [];
let extraParticles = [];
let blackHole = { x: 0, y: 0, size: 0, maxSize: 0, gravity: 0 };
let soundLevel = 0;
let mic;
let hasMicAccess = false;
let phase = 0;
let showTrails = true;
let t = 0;

// mode
let currentMode = 1; // 1: auto, 2: interaction
let modeTransition = false;
// Mode switch button properties
let switchBtn = { x: 20, y: 120, w: 140, h: 30, text: "Switch to Interaction" };

// sfx
let bgMusic;          // blackhole.mp3 - bgm
let switchSound;      // switch.mp3 - switch model sfx
let touchSound;       // touch.mp3 - interaction sfx
let particleSound;    // particle.mp3 - particle sfx
let soundStarted = false;

function preload() {
    // load the specified sfx file
    try {
        bgMusic = loadSound('assets/blackhole.mp3', 
            () => console.log("bgm sfx loaded successfully"),
            (e) => console.error("bgm sfx failed to load:", e)
        );
        
        switchSound = loadSound('assets/switch.mp3',
            () => console.log("switch sfx loaded successfully"),
            (e) => console.error("switch sfx failed to load:", e)
        );
        
        touchSound = loadSound('assets/touch.mp3',
            () => console.log("interaction sfx loaded successfully"),
            (e) => console.error("interaction sfx failed to load:", e)
        );
        
        particleSound = loadSound('assets/particle.mp3',
            () => console.log("particle sfx loaded successfully"),
            (e) => console.error("particle sfx failed to load:", e)
        );
    } catch(e) {
        console.error("sfx loading wrong:", e);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);
    colorMode(HSB, 360, 100, 100, 1);
    
    blackHole.x = width/2;
    blackHole.y = height/2;
    blackHole.maxSize = min(width, height) * 0.2;
    
    initParticles();
    initExtraParticles();
    
    // init mic
    try {
        mic = new p5.AudioIn();
        mic.start(() => hasMicAccess = true,
                 () => console.log("Microphone permission is not obtained, sound interaction is disabled"));
    } catch(e) {
        console.log("microphone initialization failed:", e);
    }
    
    // set bgm
    if (bgMusic) {
        bgMusic.loop();
        bgMusic.setVolume(0.5);
        bgMusic.pause(); // pause first, wait user touch
    }
    
    updateBtnText(); // Initialize button text
}

function initParticles() {
    particles = [];
    for (let a = 0; a < 360; a += 15) {
        for (let r = 1; r <= 4; r++) {
            particles.push({
                x: width/2 + cos(a) * r * 80,
                y: height/2 + sin(a) * r * 80,
                size: 3 + r * 2,
                angle: a,
                orbit: r * 80,
                speed: 0.08 + r * 0.04,
                hue: a % 360,
                trail: [],
                initial: {
                    x: width/2 + cos(a) * r * 80,
                    y: height/2 + sin(a) * r * 80,
                    orbit: r * 80
                },
                soundTimer: 0
            });
        }
    }
    
    // play particle loading sfx
    if (particleSound && !soundStarted) {
        setTimeout(() => {
            if (soundStarted) {
                particleSound.play();
                particleSound.setVolume(0.7);
            }
        }, 1000);
    }
}

function initExtraParticles() {
    extraParticles = [];
    for (let i = 0; i < 400; i++) {
        let angle = random(360);
        let radius = random(30, min(width, height) / 2);
        extraParticles.push({
            angle,
            radius,
            speed: random(0.1, 0.8),
            size: random(1, 4),
            alpha: random(80, 180),
            trail: []
        });
    }
}

function draw() {
    background(5, 10, 0, showTrails ? 0.05 : 0.15);
    
    // update bgm
    updateBackgroundMusic();
    
    // mode switch transition
    if (modeTransition) {
        if ((modeTransition += 0.02) >= 1) {
            modeTransition = false;
        }
    }
    
    // update system
    currentMode === 1 ? updateAutoMode() : updateInteractiveMode();
    
    // draw system
    drawSystem();
    
    // draw extra particles
    drawExtraParticles();
    
    // information bar
    fill(255);
    noStroke();
    textSize(12);
    text(`model: ${currentMode === 1 ? "auto" : "interaction"}`, 20, 20);
    text(`stage: ${["formation", "activity", "stability", "disspation"][floor(phase)]}`, 20, 40);
    text(`partticle number: ${particles.length}`, 20, 60);
    if (currentMode === 2 && hasMicAccess) text(`sound level: ${soundLevel.toFixed(2)}`, 20, 80);
    
    // show sound state
    text(`sound: ${soundStarted ? "on" : "click to start"}`, 20, 100);
    
    // draw mode switch button
    drawSwitchButton();
    
    // update variables
    t += 0.5;
}

// Update button text based on current mode
function updateBtnText() {
    switchBtn.text = currentMode === 1 ? "Switch to Interaction" : "Switch to Auto";
}

// Draw mode switch button with hover effect
function drawSwitchButton() {
    let btnColor = mouseOverButton() ? color(80, 80, 80, 0.8) : color(50, 50, 50, 0.7);
    fill(btnColor);
    stroke(255, 0.8);
    strokeWeight(1);
    rect(switchBtn.x, switchBtn.y, switchBtn.w, switchBtn.h, 5);
    
    fill(255);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(switchBtn.text, switchBtn.x + switchBtn.w/2, switchBtn.y + switchBtn.h/2);
}

// Check if mouse is over the button
function mouseOverButton() {
    return mouseX >= switchBtn.x && mouseX <= switchBtn.x + switchBtn.w &&
           mouseY >= switchBtn.y && mouseY <= switchBtn.y + switchBtn.h;
}

// update bgm
function updateBackgroundMusic() {
    if (!bgMusic || !soundStarted) return;
    
    let volume = 0.5;
    if (phase < 1) {
        volume = 0.2 + 0.3 * ease(phase);
    } else if (phase < 2) {
        volume = 0.5;
    } else if (phase < 3) {
        volume = 0.5 + 0.3 * ease(phase - 2);
    } else {
        volume = 0.8 - 0.6 * ease(phase - 3);
    }
    
    if (currentMode === 2) {
        volume *= (1 + soundLevel * 0.5);
    }
    
    bgMusic.setVolume(constrain(volume, 0, 1));
    
    let rate = 1.0;
    if (currentMode === 1) {
        rate = 0.8 + 0.4 * ease(phase);
    } else {
        rate = 0.8 + 0.4 * soundLevel;
    }
    bgMusic.rate(constrain(rate, 0.5, 1.5));
}

function updateAutoMode() {
    phase = (phase + 0.01) % 4;
    
    // Fixed phase calculation error in original code
    if (phase < 1) {
        blackHole.size = blackHole.maxSize * ease(phase);
        blackHole.gravity = ease(phase) * 0.1;
        particles.forEach(p => p.orbit = p.initial.orbit * ease(phase));
    } else if (phase < 2) {
        blackHole.size = blackHole.maxSize;
        blackHole.gravity = 0.1;
    } else if (phase < 3) {
        const sub = phase - 2;
        blackHole.size = blackHole.maxSize * (1 - 0.7 * ease(sub));
        blackHole.gravity = 0.1 + 0.2 * ease(sub);
        particles.forEach(p => {
            p.orbit = p.initial.orbit * (1 - 0.8 * ease(sub));
            p.speed = (0.08 + (p.initial.orbit / 80) * 0.04) * (1 + sub * 2);
        });
    } else {
        const sub = phase - 3; // Corrected from original phase - 1
        blackHole.size = blackHole.maxSize * 0.3 * (1 - ease(sub));
        blackHole.gravity = 0.3 * (1 - ease(sub));
        particles.forEach(p => {
            p.orbit = p.initial.orbit * (0.2 + 0.8 * ease(sub));
            p.speed = (0.08 + (p.initial.orbit / 80) * 0.04) * (3 - 2 * ease(sub));
        });
    }
    
    updateParticles();
}

function updateInteractiveMode() {
    phase = (phase + 0.005) % 4;
    soundLevel = hasMicAccess ? mic.getLevel() * 8 : 0;
    
    if (phase < 1) {
        blackHole.size = blackHole.maxSize * ease(phase);
        blackHole.gravity = ease(phase) * 0.1;
        particles.forEach(p => p.orbit = p.initial.orbit * ease(phase));
    } else if (phase < 2) {
        blackHole.size = blackHole.maxSize;
        blackHole.gravity = 0.1 + soundLevel * 0.2;
    } else if (phase < 3) {
        const sub = phase - 2;
        blackHole.size = blackHole.maxSize * (1 - 0.7 * ease(sub));
        blackHole.gravity = 0.1 + 0.2 * ease(sub);
        particles.forEach(p => {
            p.orbit = p.initial.orbit * (1 - 0.8 * ease(sub));
            p.speed = (0.08 + (p.initial.orbit / 80) * 0.04) * (1 + sub * 2);
        });
    } else {
        const sub = phase - 3;
        blackHole.size = blackHole.maxSize * 0.3 * (1 - ease(sub));
        blackHole.gravity = 0.3 * (1 - ease(sub));
        particles.forEach(p => {
            p.orbit = p.initial.orbit * (0.2 + 0.8 * ease(sub));
            p.speed = (0.08 + (p.initial.orbit / 80) * 0.04) * (3 - 2 * ease(sub));
        });
    }
    
    updateParticles(true);
}

function updateParticles(enableInteraction = false) {
    particles.forEach(p => {
        // store track points
        if (frameCount % 3 === 0) {
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 30) p.trail.shift();
        }
        
        // gravitational calculations
        const dx = blackHole.x - p.x;
        const dy = blackHole.y - p.y;
        const distance = max(1, sqrt(dx*dx + dy*dy));
        const force = blackHole.gravity * (blackHole.size / distance);
        
        // play particle sfx
        if (soundStarted && particleSound && frameCount % 10 === 0 && p.soundTimer <= 0) {
            if (distance < blackHole.size * 2 && force > 0.05) {
                playParticleSound(force, distance);
                p.soundTimer = 30;
            }
        }
        p.soundTimer--;
        
        // orbital motion
        p.angle += p.speed * (1 - force * 0.5);
        let targetX = blackHole.x + cos(p.angle) * (p.orbit * (1 - force * 0.3));
        let targetY = blackHole.y + sin(p.angle) * (p.orbit * (1 - force * 0.3));
        
        // touch interaction
        if (enableInteraction && mouseIsPressed) {
            const mx = mouseX - p.x;
            const my = mouseY - p.y;
            const mDistance = max(1, sqrt(mx*mx + my*my));
            const touchForce = min(0.2, 40 / mDistance);
            targetX += mx * touchForce;
            targetY += my * touchForce;
            
            // play interaction sfx
            if (soundStarted && touchSound && mDistance < 100 && frameCount % 15 === 0) {
                playTouchSound(touchForce);
            }
        }
        
        // smooth movement
        const easeFactor = force > 0.2 ? 0.15 : 0.08;
        p.x = lerp(p.x, targetX, easeFactor);
        p.y = lerp(p.y, targetY, easeFactor);
        
        // color change
        p.hue = (p.hue + force * (currentMode === 1 ? 5 : 3) + 
                 (currentMode === 1 ? phase * 20 : soundLevel * 10)) % 360;
    });
}

function drawExtraParticles() {
    push();
    translate(width / 2, height / 2);

    let mx = mouseX - width / 2;
    let my = mouseY - height / 2;

    for (let p of extraParticles) {
        p.angle += p.speed;

        let targetRadius = p.radius + sin(t * 0.5) * 1.5;

        if (currentMode === 2 && mouseIsPressed) {
            const dx = p.x - mx;
            const dy = p.y - my;
            const d = sqrt(dx * dx + dy * dy);
            if (d < 100) {
                const pushStrength = (100 - d) / 100 * 5;
                targetRadius += pushStrength;
                if (!p.trail) p.trail = [];
                p.trail.push({ x: cos(p.angle) * targetRadius, y: sin(p.angle) * targetRadius, alpha: p.alpha });
                if (p.trail.length > 20) p.trail.shift();
            }
        }

        let x = cos(p.angle) * targetRadius;
        let y = sin(p.angle) * targetRadius;

        let sizeModifier = 1;
        let alphaModifier = p.alpha;
        if (hasMicAccess) {
            sizeModifier += soundLevel * 0.5;
            alphaModifier = constrain(p.alpha + soundLevel * 50, 50, 255);
        }
        sizeModifier *= 1 + blackHole.size / 1000;

        if (p.trail && p.trail.length > 1) {
            noFill();
            stroke(180 + sin(t + p.angle) * 50, 220, 255, 0.3);
            strokeWeight(1);
            beginShape();
            for (let point of p.trail) vertex(point.x, point.y);
            endShape();
            p.trail.forEach(pt => pt.alpha *= 0.9);
            p.trail = p.trail.filter(pt => pt.alpha > 10);
        }

        fill(180 + sin(t + p.angle) * 50, 220, 255, alphaModifier);
        noStroke();
        ellipse(x, y, p.size * sizeModifier);
    }

    pop();
}

function drawSystem() {
    // draw trail
    if (showTrails) {
        particles.forEach(p => {
            if (p.trail.length < 2) return;
            noFill();
            stroke(p.hue, 80, 90, currentMode === 1 ? 0.3 : 0.2);
            strokeWeight(currentMode === 1 ? 1 : 0.5);
            beginShape();
            p.trail.forEach(point => vertex(point.x, point.y));
            endShape();
        });
    }
    
    // draw connecting wire
    stroke(200, 50, 60, 0.2);
    strokeWeight(0.5);
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        const p2 = particles[(i + 1) % particles.length];
        if (abs(p1.orbit - p2.orbit) < 10) line(p1.x, p1.y, p2.x, p2.y);
    }
    
    // draw particle
    particles.forEach(p => {
        push();
        translate(p.x, p.y);
        rotate(p.angle + frameCount * (currentMode === 1 ? 1 : 0.5));
        
        fill(p.hue, 80, 80, 0.7);
        noStroke();
        ellipse(0, 0, p.size * 2);
        
        stroke(p.hue, 80, 100, 0.8);
        noFill();
        strokeWeight(1);
        beginShape();
        for (let a = 0; a < 360; a += 60) vertex(cos(a) * p.size, sin(a) * p.size);
        endShape(CLOSE);
        
        fill(360, 100, 100, 0.6);
        ellipse(0, 0, p.size * 0.5);
        
        pop();
    });
    
    // draw blackhole
    drawBlackHole();
}

function drawBlackHole() {
    push();
    translate(blackHole.x, blackHole.y);
    rotate(frameCount * 0.3);
    
    // wave effect
    const waveRadius = blackHole.size * 2 * (1 + sin(frameCount * 0.5) * 0.1);
    noFill();
    stroke(60, 80, 50, 0.1);
    strokeWeight(3);
    ellipse(0, 0, waveRadius);
    
    // line effect
    stroke(60, 80, 50, 0.3);
    strokeWeight(2);
    for (let a = 0; a < 360; a += 15) line(0, 0, cos(a) * blackHole.size * 2, sin(a) * blackHole.size * 2);
    
    // accretion disk
    push();
    rotate(frameCount * 0.8);
    fill(30, 60, 40, 0.2);
    ellipse(0, 0, blackHole.size * 3, blackHole.size * 0.5);
    pop();
    
    // blackhole middle
    fill(0);
    ellipse(0, 0, blackHole.size);
    
    // event horizon effect
    noFill();
    stroke(200, 50, 80, 0.3);
    strokeWeight(1);
    ellipse(0, 0, blackHole.size * 1.2);
    
    pop();
}

function switchMode(mode) {
    modeTransition = 0.01;
    currentMode = mode;
    
    if (soundStarted && switchSound) {
        switchSound.play();
        switchSound.setVolume(0.7);
    }
    
    updateBtnText(); // Update button text after mode switch
    
    particles.forEach(p => {
        p.orbit = p.initial.orbit;
        p.speed = 0.08 + (p.initial.orbit / 80) * 0.04;
        p.trail = [];
        p.soundTimer = 0;
    });
    phase = 0;
}

function ease(t) {
    t = constrain(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function touchStarted() {
    // Check if mode switch button is clicked
    if (mouseOverButton()) {
        switchMode(currentMode === 1 ? 2 : 1);
        return false;
    }
    
    if (currentMode === 2 && phase < 1) phase = 1;
    
    if (!soundStarted) {
        startSounds();
        soundStarted = true;
    }
    
    return false;
}

function mousePressed() {
    // Check if mode switch button is clicked
    if (mouseOverButton()) {
        switchMode(currentMode === 1 ? 2 : 1);
        return false;
    }
    
    if (!soundStarted) {
        startSounds();
        soundStarted = true;
    }
}

function keyPressed() {
    if (key === ' ') showTrails = !showTrails;
    if (key === 'm' || key === 'M') switchMode(currentMode === 1 ? 2 : 1);
    if (key === 'r' || key === 'R') {
        initParticles();
        initExtraParticles();
        phase = 0;
    }
    
    if (!soundStarted) {
        startSounds();
        soundStarted = true;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    blackHole.x = width/2;
    blackHole.y = height/2;
    initParticles();
    initExtraParticles();
}

// play all sound
function startSounds() {
    try {
        if (getAudioContext().state === 'suspended') {
            getAudioContext().resume();
        }
        
        if (bgMusic && bgMusic.isPaused()) {
            bgMusic.play();
        }
        
        if (particleSound) {
            particleSound.play();
            particleSound.setVolume(0.5);
        }
    } catch(e) {
        console.error("failed to start sfx:", e);
    }
}

// play particle sfx
function playParticleSound(force, distance) {
    if (!particleSound) return;
    
    const volume = map(distance, blackHole.size, blackHole.size * 2, 0.5, 0.1);
    particleSound.setVolume(constrain(volume, 0.1, 0.5));
    
    const rate = map(force, 0.05, 0.5, 0.8, 1.5);
    particleSound.rate(constrain(rate, 0.5, 2.0));
    
    if (!particleSound.isPlaying()) {
        particleSound.play();
    }
}

// play interaction SFX
function playTouchSound(force) {
    if (!touchSound) return;
    
    const volume = map(force, 0, 0.2, 0.2, 0.5);
    touchSound.setVolume(constrain(volume, 0.2, 0.5));
    
    const rate = map(force, 0, 0.2, 0.9, 1.3);
    touchSound.rate(constrain(rate, 0.7, 1.5));
    
    if (!touchSound.isPlaying()) {
        touchSound.play();
    }
}
