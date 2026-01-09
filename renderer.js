import { trimAudio, changeSpeed, changePitch, changeVolume } from './tools.js';

const audio = document.getElementById('player');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const audioRange = document.getElementById('audioRange');
const timeLabel = document.getElementById('timeLabel');

const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');

const saveButton = document.getElementById('saveButton');

const fileLabel = document.getElementById('fileLabel');
const fileInput = document.getElementById('fileInput');
const fileSpan = document.getElementById('fileSpan');

const trimH2 = document.getElementById('trimH2');
const trimStartLabel = document.getElementById('trimStartLabel');
const trimStart = document.getElementById('trimStart');
const trimEndLabel = document.getElementById('trimEndLabel');
const trimEnd = document.getElementById('trimEnd');
const applyTrim = document.getElementById('applyTrim');

const speedH2 = document.getElementById('speedH2');
const speedRange = document.getElementById('speedRange');
const speedSpinbox = document.getElementById('speedSpinbox');
const applySpeed = document.getElementById('applySpeed');

const pitchH2 = document.getElementById('pitchH2');
const pitchRange = document.getElementById('pitchRange');
const pitchSpinbox = document.getElementById('pitchSpinbox');
const applyPitch = document.getElementById('applyPitch');

const volumeH2 = document.getElementById('volumeH2');
const volumeRange = document.getElementById('volumeRange');
const volumeSpinbox = document.getElementById('volumeSpinbox');
const applyVolume = document.getElementById('applyVolume');

const main = document.querySelector('main');
const footer = document.querySelector('footer');

const undoStack = [];
const redoStack = [];

const browserLanguage = navigator.language.slice(0, 2);
let translations;

function roundTo(num, decimals) {
	const factor = Math.pow(10, decimals);
	return Math.round(num * factor) / factor;
}

function numberToTime(sec) {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function timeToNumber(str) {
	const [m, s] = str.split(':').map(Number);
	return m * 60 + s;
}

function setupSpinbox(inputEl, min, max, step, isTime) {
	const container = inputEl.parentElement;
	const upBtn = container.querySelector('.up');
	const downBtn = container.querySelector('.down');

	function parseTime(str) {
		if (isTime) {
			return timeToNumber(str);
		} else {
			return Number(str);
		}
	}

	function updateValue(newVal) {
		if (newVal > max) newVal = min;
		if (newVal < min) newVal = max;
		if (isTime) {
			inputEl.value = numberToTime(Number(newVal));
		} else {
			if (step < 1) {
				inputEl.value = roundTo(newVal, 1);
			} else {
				inputEl.value = newVal;
			}
		}
	}

	upBtn.addEventListener('click', () => {
		const current = parseTime(inputEl.value);
		updateValue(current + step);
	});

	downBtn.addEventListener('click', () => {
		const current = parseTime(inputEl.value);
		updateValue(current - step);
	});

	inputEl.addEventListener('change', () => {
		const current = parseTime(inputEl.value);
		updateValue(current);
	});
}

function loadAudio() {
	audioRange.max = audio.duration;
	audioRange.value = 0;
	timeLabel.textContent = numberToTime(0) + ' / ' + numberToTime(audio.duration);

	setupSpinbox(trimStart, 0, Math.floor(audio.duration), 1, true);
	setupSpinbox(trimEnd, 0, Math.floor(audio.duration), 1, true);
}

function saveState() {
	undoStack.push(audio.src);
	redoStack.length = 0;
}

function undo() {
	if (undoStack.length > 1) {
		const current = undoStack.pop();
		redoStack.push(current);

		const prev = undoStack[undoStack.length - 1];
		audio.src = prev;
		audio.load();
		audio.addEventListener ('loadedmetadata', () => { loadAudio(); }, { once: true });
	}
}

function redo() {
	if (redoStack.length > 0) {
		const next = redoStack.pop();
		undoStack.push(next);

		audio.src = next;
		audio.load();
		audio.addEventListener ('loadedmetadata', () => { loadAudio(); }, { once: true });
	}
}

fileInput.addEventListener('change', e => {
	const file = e.target.files[0];
	if (file) {
		audio.src = URL.createObjectURL(file);
		audio.addEventListener ('loadedmetadata', () => {
			undoStack.length = 0;
			redoStack.length = 0;

			undoStack.push(audio.src);

			let fileName;

			if (file.name.length > 50) {
				const start = file.name.slice(0, 30);
				const end = file.name.slice(-15);
				fileName = start + '...' + end;
			} else {
				fileName = file.name;
			}

			fileSpan.textContent = fileName;

			loadAudio();
		}, { once: true });
	}
});

playBtn.addEventListener('click', () => {
	if (!isNaN(audio.duration)) {
		audio.play();
		playBtn.style.display = 'none';
		pauseBtn.style.display = 'flex';
	}
});

pauseBtn.addEventListener('click', () => {
	if (!isNaN(audio.duration)) {
		audio.pause();
		pauseBtn.style.display = 'none';
		playBtn.style.display = 'flex';
	}
});

audio.addEventListener('timeupdate', () => {
	audioRange.value = audio.currentTime;
	timeLabel.textContent = numberToTime(audio.currentTime) + ' / ' + numberToTime(audio.duration);
});

audioRange.addEventListener('input', () => {
	audio.currentTime = audioRange.value;
});

audio.addEventListener('ended', () => {
	pauseBtn.style.display = 'none';
	playBtn.style.display = 'flex';
});

undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

saveButton.addEventListener('click', () => {
	const src = audio.src;
	if (!src) return;

	const a = document.createElement('a');
	a.href = src;

	const baseName = fileInput.files[0]?.name.replace(/\.[^/.]+$/, '');
	a.download = baseName + '_edited.wav';

	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
});

speedRange.addEventListener('input', () => {
	speedSpinbox.value = speedRange.value;
});

pitchRange.addEventListener('input', () => {
	pitchSpinbox.value = pitchRange.value;
});

volumeRange.addEventListener('input', () => {
	volumeSpinbox.value = volumeRange.value;
});

applyTrim.addEventListener('click', () => {
	trimAudio(audio, timeToNumber(trimStart.value), timeToNumber(trimEnd.value));
	audio.addEventListener ('loadedmetadata', () => {
		loadAudio();
		saveState();
	}, { once: true });
});

applySpeed.addEventListener('click', () => {
	changeSpeed(audio, Number(speedSpinbox.value));
	audio.addEventListener ('loadedmetadata', () => {
		loadAudio();
		saveState();
	}, { once: true });
});

applyPitch.addEventListener('click', () => {
	changePitch(audio, Number(pitchSpinbox.value));
	audio.addEventListener ('loadedmetadata', () => {
		loadAudio();
		saveState();
	}, { once: true });
});

applyVolume.addEventListener('click', () => {
	changeVolume(audio, Number(volumeSpinbox.value));
	audio.addEventListener ('loadedmetadata', () => {
		loadAudio();
		saveState();
	}, { once: true });
});

setupSpinbox(speedSpinbox, 0.2, 10, 0.1, false);
setupSpinbox(pitchSpinbox, 0.2, 10, 0.1, false);
setupSpinbox(volumeSpinbox, 0.2, 10, 0.1, false);

main.style.marginBottom = footer.offsetHeight + 20 + 'px';
window.addEventListener('resize', () => {
	main.style.marginBottom = footer.offsetHeight + 20 + 'px';
});

fetch('translations.json')
	.then(response => response.json())
	.then(data => {
		translations = data;
		if (translations[browserLanguage]) {
			const t = translations[browserLanguage];

			document.title = t['Audio editor'];
			saveButton.textContent = t['Save'];
			fileLabel.textContent = t['Select a file on your device'];
			fileSpan.textContent = t['No file selected'];
			trimH2.textContent = t['Trim'];
			trimStartLabel.textContent = t['Start:'];
			trimEndLabel.textContent = t['End:'];
			speedH2.textContent = t['Speed'];
			pitchH2.textContent = t['Pitch'];
			volumeH2.textContent = t['Volume'];
			undoButton.title = t['Undo'];
			redoButton.title = t['Redo'];
			playBtn.title = t['Play'];
			pauseBtn.title = t['Pause'];

			[applyTrim, applySpeed, applyPitch, applyVolume].forEach(el => {
				el.textContent = t['Apply'];
			});
		}
	})
	.catch(error => {
		console.error(error);
	});
