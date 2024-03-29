import { decodeOptcode } from './optcode.js';
import { randomInt, getPressedKey } from '../utils.js';

export function cycle({ state, display, keyboard, random = () => randomInt({ min: 0, max: 0x100 }) }) {
	const incrementProgramCounter = (n = 2) => { state.programCounter += n; };

	const optcode = (state.memory[state.programCounter] << 8) | state.memory[state.programCounter + 1];
	const { instruction, NNN, NN, N, X, Y } = decodeOptcode(optcode);

	switch (instruction) {
	case 0x0:
		switch (optcode) {
		case 0x00E0:
			display.clear();
			incrementProgramCounter();
			break;
		case 0x00EE:
			state.programCounter = state.stack.pop();
			incrementProgramCounter();
			break;
		}
		break;
	case 0x1:
		state.programCounter = NNN;
		break;
	case 0x2:
		state.stack.push(state.programCounter);
		state.programCounter = NNN;
		break;
	case 0x3:
		incrementProgramCounter(state.registers[X] === NN ? 4 : 2);
		break;
	case 0x4:
		incrementProgramCounter(state.registers[X] !== NN ? 4 : 2);
		break;
	case 0x5:
		incrementProgramCounter(state.registers[X] === state.registers[Y] ? 4 : 2);
		break;
	case 0x6:
		state.registers[X] = NN;
		incrementProgramCounter();
		break;
	case 0x7:
		state.registers[X] += NN;
		incrementProgramCounter();
		break;
	case 0x8:
		switch(N) {
		case 0x0:
			state.registers[X] = state.registers[Y];
			break;
		case 0x1:
			state.registers[X] |= state.registers[Y];
			break;
		case 0x2:
			state.registers[X] &= state.registers[Y];
			break;
		case 0x3:
			state.registers[X] ^= state.registers[Y];
			break;
		case 0x4: {
			const result = state.registers[X] + state.registers[Y];
			state.registers[X] = result;
			state.registers[0xF] = (result >> 8) & 1;
			break;
		}
		case 0x5: {
			const result = state.registers[X] - state.registers[Y];
			state.registers[X] = result;
			state.registers[0xF] = result < 0 ? 0 : 1;
			break;
		}
		case 0x6:
			state.registers[0xF] = state.registers[X] & 1;
			state.registers[X] >>= 1;
			break;
		case 0x7: {
			const result = state.registers[Y] - state.registers[X];
			state.registers[X] = result;
			state.registers[0xF] = result < 0 ? 0 : 1;
			break;
		}
		case 0xE:
			state.registers[0xF] = (state.registers[X] >> 7) & 1;
			state.registers[X] <<= 1;
			break;
		default:
			throw UnknownOptcode(optcode);
		}
		incrementProgramCounter();
		break;
	case 0x9:
		state.programCounter += (state.registers[X] !== state.registers[Y] ? 4 : 2);
		break;
	case 0xA:
		state.addressRegister[0] = NNN;
		incrementProgramCounter();
		break;
	case 0xB:
		state.programCounter = NNN + state.registers[0];
		break;
	case 0xC:
		state.registers[X] = random() & NN;
		incrementProgramCounter();
		break;
	case 0xD: {
		let pixelFlippedOff = false;

		for (let y = 0; y < N; y++) {
			const sprite = state.memory[state.addressRegister[0] + y];
			for (let x = 0; x < 8; x++) {
				const pixel = (sprite >> (7 - x)) & 1;
				if (pixel) {
					const pixelState = display.flipPixel(
						state.registers[X] + x,
						state.registers[Y] + y);
					pixelFlippedOff |= !pixelState;
				}
			}
		}

		state.registers[0xF] = pixelFlippedOff ? 1 : 0;

		incrementProgramCounter();
		break;
	}
	case 0xE: {
		let stepSize;
		switch(NN) {
		case 0x9E:
			stepSize = (keyboard[0] & (1 << state.registers[X])) ? 4 : 2;
			break;
		case 0xA1:
			stepSize = (keyboard[0] & (1 << state.registers[X])) ? 2 : 4;
			break;
		}
		incrementProgramCounter(stepSize);
		break;
	}
	case 0xF:
		switch (NN) {
		case 0x07:
			state.registers[X] = Math.ceil(state.delayTimer / state.timerScaler);
			incrementProgramCounter();
			break;
		case 0x0A:
			if (keyboard[0] === 0)
				// Deliberately stop executing the function, so the program counter
				// and timers are not updated.
				return;

			state.registers[X] = getPressedKey(keyboard);
			incrementProgramCounter();
			break;
		case 0x15:
			state.delayTimer = state.registers[X] * state.timerScaler;
			incrementProgramCounter();
			break;
		case 0x18:
			state.soundTimer = state.registers[X] * state.timerScaler;
			incrementProgramCounter();
			break;
		case 0x29:
			state.addressRegister[0] = state.registers[X] * 5;
			incrementProgramCounter();
			break;
		case 0x33: {
			const I = state.addressRegister[0];
			const x = state.registers[X];
			state.memory[I + 0] = x / 100 % 10;
			state.memory[I + 1] = x / 10  % 10;
			state.memory[I + 2] = x       % 10;
			incrementProgramCounter();
			break;
		}
		case 0x55:
			state.memory.set(
				state.registers.slice(0, X + 1),
				state.addressRegister[0]);
			incrementProgramCounter();
			break;
		case 0x65:
			state.registers.set(
				state.memory.slice(state.addressRegister[0], state.addressRegister[0] + X + 1),
				0);
			incrementProgramCounter();
			break;
		case 0x1E:
			state.addressRegister[0] += state.registers[X];
			incrementProgramCounter();
			break;
		default:
			throw UnknownOptcode(optcode);
		}
		break;
	default:
		throw UnknownOptcode(optcode);
	}

	if (state.delayTimer > 0) state.delayTimer--;
	if (state.soundTimer > 0) state.soundTimer--;
}

function UnknownOptcode(optcode) {
	return new Error(`Unknown optcode 0x${optcode.toString(16).toUpperCase().padStart(4, '0')}`);
}
