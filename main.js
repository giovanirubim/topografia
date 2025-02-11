const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

const grid = `
	W' A  B  C  D  E  F  G  H
	X' I  J  K  L  M  N  O  P
	Y' Q  R  S  T  U  V  W  X
	Z' Y  Z  A' B' C' D' E' F'
	A" G' H' I' J' K' L' M' N'
	B" O' P' Q' R' S' T' U' V'
`

const mat = grid
	.trim()
	.split('\n')
	.map((row) => row.trim().split(/\s+/))

const points = mat.flat()

const toPos = {}

mat.forEach((row, i) => {
	row.forEach((cell, j) => {
		toPos[cell] = [i, j]
	})
})

const getCoord = (point) => {
	const [i, j] = toPos[point]
	return [(j + 0.5) * space, (i + 0.5) * space]
}

let space = 1
let readings = ``.trim().replace(/[‘’]/g, "'").replace(/“”/g, '"')
let outputText = ''
let edges = []
let nodeVal = {}

const spreadMeasurements = () => {
	let changed = true
	let outputText = ''
	while (changed) {
		changed = false
		for (const [a, b, c] of edges) {
			if (nodeVal[a] !== undefined && nodeVal[b] === undefined) {
				const val = nodeVal[a] + c
				outputText += `${a} -> ${b} = ${nodeVal[a]} + ${c} = ${val}\n`
				changed = true
				nodeVal[b] = val
			}
			if (nodeVal[b] !== undefined && nodeVal[a] === undefined) {
				const val = nodeVal[b] - c
				outputText += `${b} -> ${a} = ${nodeVal[b]} - ${c} = ${val}\n`
				changed = true
				nodeVal[a] = val
			}
		}
	}
	return outputText
}

const calculate = () => {
	const text = readings
		.trim()
		.replace(/[‘’]/g, "'")
		.replace(/“”/g, '"')
		.toUpperCase()

	if (!text) return

	outputText = ''
	edges = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.includes('!'))
		.map((l) => l.split(/\s+/))
		.map(([a, b, c]) => [a, b, parseFloat(c)])

	const calcDist = (a, b) => {
		console.log({ a, b })
		const [ai, aj] = toPos[a]
		const [bi, bj] = toPos[b]
		return Math.sqrt((ai - bi) ** 2 + (aj - bj) ** 2)
	}

	for (const [a, b] of edges) {
		const dist = calcDist(a, b)
		if (dist > Math.SQRT2 * 1.001) {
			outputText += `Aviso: distância elevada ${a} -> ${b}\n`
		}
	}

	nodeVal = { A: 0 }
	outputText += spreadMeasurements()

	const div = document.querySelector('#output')
	div.innerHTML = ''
	outputText.split('\n').forEach((text) => {
		const line = document.createElement('p')
		line.textContent = text
		div.appendChild(line)
	})

	localStorage.setItem('readings', readings);
}

const resizeCanvas = () => {
	const dom = document.querySelector('.canvas > .content')
	const width = dom.clientWidth
	canvas.width = width
	space = width / mat[0].length
	canvas.height = Math.round(space * mat.length)
}

const drawCanvas = () => {
	ctx.fillStyle = '#444'
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	ctx.strokeStyle = 'rgba(255, 127, 0, 0.3)'
	ctx.lineWidth = 5
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	for (const [a, b] of edges) {
		ctx.beginPath()
		ctx.moveTo(...getCoord(a))
		ctx.lineTo(...getCoord(b))
		ctx.stroke()
	}

	ctx.font = canvas.width * 0.04 + 'px monospace'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillStyle = '#fff'
	for (const point of points) {
		ctx.fillText(point, ...getCoord(point))
	}
}

const readingsInput = document.querySelector('#readings')

readingsInput.addEventListener('input', (e) => {
	readings = e.target.value
	calculate()
	drawCanvas()
})

window.addEventListener('resize', () => {
	resizeCanvas()
	drawCanvas()
})

const loadReadings = async () => {
	let text = localStorage.getItem('readings')
	if (text) return text;
	const req = await fetch('./readings.txt')
	text = await req.text()
	return text
}

readings = await loadReadings()
readingsInput.value = readings

calculate()
resizeCanvas()
drawCanvas()
