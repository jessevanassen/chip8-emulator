export function decodeOptcode(optcode) {
	return {
		instruction: optcode >> 12 & 0x000F,
		NNN: optcode & 0x0FFF,
		NN: optcode & 0x00FF,
		N: optcode & 0x000F,
		X: optcode >> 8 & 0x000F,
		Y: optcode >> 4 & 0x000F,
	};
}

export function cycle({ state, display }) {
	const incrementProgramCounter = () => { state.programCounter += 2; };

	const optcode = (state.memory[state.programCounter] << 8) | state.memory[state.programCounter + 1];
	const { instruction, NNN, NN, N, X, Y } = decodeOptcode(optcode);

	switch (instruction) {
	case 0x0:
		if (Y === 0xE) {
			display.clear();
			incrementProgramCounter();
		}
		break;
	case 0x1:
		state.programCounter = NNN;
		break;
	case 0x2:
		break;
	case 0x3:
		break;
	case 0x4:
		break;
	case 0x5:
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
		break;
	case 0x9:
		break;
	case 0xA:
		state.addressRegister[0] = NNN;
		incrementProgramCounter();
		break;
	case 0xB:
		break;
	case 0xC:
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
	case 0xE:
		break;
	case 0xF:
		break;
	}

	if (state.delayTimer > 0) state.delayTimer--;
	if (state.soundTimer > 0) state.soundTimer--;
}
