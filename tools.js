export async function trimAudio(audio, start, end) {
	const decoded = await getCurrentAudioBuffer(audio);

	const newLength = (end - start) * decoded.sampleRate;

	const audioCtx = new AudioContext();
	const newBuffer = audioCtx.createBuffer(decoded.numberOfChannels, newLength, decoded.sampleRate);

	for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
		const oldData = decoded.getChannelData(ch);
		const newData = newBuffer.getChannelData(ch);
		newData.set(oldData.subarray(start * decoded.sampleRate, end * decoded.sampleRate));
	}

	const wavBlob = audioBufferToWav(newBuffer);
	const url = URL.createObjectURL(wavBlob);
	audio.src = url;
	audio.load();
}

export async function changeSpeed(audio, speed) {
	const decoded = await getCurrentAudioBuffer(audio);

	const newLength = Math.floor(decoded.length / speed);

	const audioCtx = new AudioContext();
	const newBuffer = audioCtx.createBuffer(decoded.numberOfChannels, newLength, decoded.sampleRate);

	for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
		const oldData = decoded.getChannelData(ch);
		const newData = newBuffer.getChannelData(ch);

		for (let i = 0; i < newLength; i++) {
			const oldIndex = i * speed;
			const i0 = Math.floor(oldIndex);
			const i1 = Math.min(i0 + 1, oldData.length - 1);
			const frac = oldIndex - i0;

			newData[i] = oldData[i0] * (1 - frac) + oldData[i1] * frac;
		}
	}

	const wavBlob = audioBufferToWav(newBuffer);
	const url = URL.createObjectURL(wavBlob);
	audio.src = url;
	audio.load();
}

export async function changePitch(audio, semitones) {
	const decoded = await getCurrentAudioBuffer(audio);

	const pitchFactor = Math.pow(2, semitones / 12);
	const newLength = Math.floor(decoded.length / pitchFactor);

	const audioCtx = new AudioContext();
	const newBuffer = audioCtx.createBuffer(decoded.numberOfChannels, newLength, decoded.sampleRate);

	for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
		const oldData = decoded.getChannelData(ch);
		const newData = newBuffer.getChannelData(ch);

		for (let i = 0; i < newLength; i++) {
			const oldIndex = i * pitchFactor;
			const i0 = Math.floor(oldIndex);
			const i1 = Math.min(i0 + 1, oldData.length - 1);
			const frac = oldIndex - i0;

			newData[i] = oldData[i0] * (1 - frac) + oldData[i1] * frac;
		}
	}

	const targetLength = decoded.length;
	const stretchedBuffer = audioCtx.createBuffer(decoded.numberOfChannels, targetLength, decoded.sampleRate);

	const frameSize = 1024;
	const hopOut = frameSize / 2;
	const ratio = newLength / targetLength;

	const window = new Float32Array(frameSize);

	for (let i = 0; i < frameSize; i++) {
		window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
	}

	for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
		const inData = newBuffer.getChannelData(ch);
		const outData = stretchedBuffer.getChannelData(ch);

		const weight = new Float32Array(targetLength);

		for (let outPos = 0; outPos < targetLength; outPos += hopOut) {
			const inPosFloat = outPos * ratio;
			const inPos = Math.floor(inPosFloat);

			for (let i = 0; i < frameSize; i++) {
				const outIndex = outPos + i;
				if (outIndex >= targetLength) break;

				const srcIndex = inPos + i;
				let sample = 0;
				if (srcIndex >= 0 && srcIndex < inData.length - 1) {
					const s0 = inData[srcIndex];
					const s1 = inData[srcIndex + 1];
					const frac = inPosFloat - inPos;
					sample = s0 * (1 - frac) + s1 * frac;
				} else if (srcIndex === inData.length - 1) {
					sample = inData[srcIndex];
				} else {
					sample = 0;
				}

				const w = window[i];
				outData[outIndex] += sample * w;
				weight[outIndex] += w;
			}
		}

		for (let i = 0; i < targetLength; i++) {
			if (weight[i] > 1e-6) {
				outData[i] /= weight[i];
			}
		}
	}

	const wavBlob = audioBufferToWav(stretchedBuffer);
	const url = URL.createObjectURL(wavBlob);
	audio.src = url;
	audio.load();
}

export async function changeVolume(audio, volume) {
	const decoded = await getCurrentAudioBuffer(audio);

	const audioCtx = new AudioContext();
	const newBuffer = audioCtx.createBuffer(decoded.numberOfChannels, decoded.length, decoded.sampleRate);

	for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
		const oldData = decoded.getChannelData(ch);
		const newData = newBuffer.getChannelData(ch);

		for (let i = 0; i < decoded.length; i++) {
			newData[i] = oldData[i] * volume;
		}
	}

	const wavBlob = audioBufferToWav(newBuffer);
	const url = URL.createObjectURL(wavBlob);
	audio.src = url;
	audio.load();
}

async function getCurrentAudioBuffer(audio) {
	const response = await fetch(audio.src);
	const arrayBuffer = await response.arrayBuffer();
	const audioCtx = new AudioContext();

	return await audioCtx.decodeAudioData(arrayBuffer);
}

function audioBufferToWav(buffer) {
	const numOfChan = buffer.numberOfChannels;
	const length = buffer.length * numOfChan * 2 + 44;
	const bufferArray = new ArrayBuffer(length);
	const view = new DataView(bufferArray);
	const channels = [];
	const sampleRate = buffer.sampleRate;

	let offset = 0;

	function writeString(s) {
		for (let i = 0; i < s.length; i++) {
			view.setUint8(offset++, s.charCodeAt(i));
		}
	}

	writeString('RIFF');
	view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
	writeString('WAVE');
	writeString('fmt ');
	view.setUint32(offset, 16, true); offset += 4;
	view.setUint16(offset, 1, true); offset += 2;
	view.setUint16(offset, numOfChan, true); offset += 2;
	view.setUint32(offset, sampleRate, true); offset += 4;
	view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
	view.setUint16(offset, numOfChan * 2, true); offset += 2;
	view.setUint16(offset, 16, true); offset += 2;
	writeString('data');
	view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

	for (let i = 0; i < buffer.length; i++) {
		for (let ch = 0; ch < numOfChan; ch++) {
			let sample = buffer.getChannelData(ch)[i] * 32767;
			if (sample < -32768) sample = -32768;
			if (sample > 32767) sample = 32767;
			view.setInt16(offset, sample, true);
			offset += 2;
		}
	}

	return new Blob([view], {type: 'audio/wav'});
}
