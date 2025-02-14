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
let used = []

const spreadMeasurements = () => {
	used = []
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
				used.push([a, b])
			}
			if (nodeVal[b] !== undefined && nodeVal[a] === undefined) {
				const val = nodeVal[b] - c
				outputText += `${b} -> ${a} = ${nodeVal[b]} - ${c} = ${val}\n`
				changed = true
				nodeVal[a] = val
				used.push([b, a])
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
		.filter((l) => l.length === 3)
		.map(([a, b, c]) => [a, b, parseFloat(c)])

	const calcDist = (a, b) => {
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

	for (let [a, b, val] of edges) {
		const aVal = nodeVal[a]
		const bVal = nodeVal[b]
		const diff = bVal - aVal
		if (isNaN(diff)) continue
		if (val !== diff) {
			outputText += `Aviso: Leitura ${a} -> ${b} = ${val} difere do calculado\n`
		}
	}

	const div = document.querySelector('#output')
	div.innerHTML = ''
	outputText.split('\n').forEach((text) => {
		const line = document.createElement('div')
		line.textContent = text
		div.appendChild(line)
	})

	localStorage.setItem('readings', readings)
}

const resizeCanvas = () => {
	const dom = document.querySelector('.canvas > .content')
	const width = dom.clientWidth
	canvas.width = width
	space = width / mat[0].length
	canvas.height = Math.round(space * mat.length)
}

const LABELS = 'labels'
const VALUES = 'values'
const COLORS = 'colors'
const viewModes = [LABELS, VALUES, COLORS]
let viewMode = LABELS

const drawViewMode = () => {
	ctx.strokeStyle = 'rgba(255, 127, 0, 0.3)'
	ctx.lineWidth = space * 0.1
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	for (const [a, b] of edges) {
		ctx.beginPath()
		ctx.moveTo(...getCoord(a))
		ctx.lineTo(...getCoord(b))
		ctx.stroke()
	}

	ctx.font = space * 0.3 + 'px monospace'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillStyle = '#fff'
	for (const point of points) {
		ctx.fillText(point, ...getCoord(point))
	}
}

const drawValues = () => {
	ctx.strokeStyle = 'rgba(0, 192, 255, 0.5)'
	ctx.lineWidth = space * 0.05
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	const tip = space * 0.2
	const tilt = Math.PI * 0.85
	const gap = space * 0.2
	for (const [a, b] of used) {
		const [ax, ay] = getCoord(a)
		const [bx, by] = getCoord(b)
		const angle = Math.atan2(by - ay, bx - ax)
		const mx = bx + Math.cos(angle + tilt) * tip
		const my = by + Math.sin(angle + tilt) * tip
		const qx = bx + Math.cos(angle - tilt) * tip
		const qy = by + Math.sin(angle - tilt) * tip
		const dx = bx - ax
		const dy = by - ay
		const dist = Math.hypot(dx, dy)
		const nx = dx / dist
		const ny = dy / dist
		ctx.beginPath()
		ctx.moveTo(ax + nx * gap, ay + ny * gap)
		ctx.lineTo(bx - nx * gap, by - ny * gap)
		ctx.moveTo(mx - nx * gap, my - ny * gap)
		ctx.lineTo(bx - nx * gap, by - ny * gap)
		ctx.lineTo(qx - nx * gap, qy - ny * gap)
		ctx.stroke()
	}

	ctx.font = space * 0.3 + 'px monospace'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	for (const point of points) {
		const val = nodeVal[point]
		const text = val === undefined ? point : val
		ctx.fillStyle = val === undefined ? '#666' : '#fff'
		ctx.fillText(text, ...getCoord(point))
	}
}

const drawColors = () => {
	const nRows = mat.length
	const nCols = mat[0].length
	const values = Object.values(nodeVal)
	const minVal = Math.min(...values)
	const maxVal = Math.max(...values)
	const range = maxVal - minVal

	const minColor = [0, 0, 255]
	const maxColor = [255, 255, 0]

	for (let i = 0; i < nRows; i++) {
		for (let j = 0; j < nCols; ++j) {
			const point = mat[i][j]
			const val = nodeVal[point]
			if (val === undefined) continue
			const ratio = (val - minVal) / range
			const color = minColor.map((c, i) => c + (maxColor[i] - c) * ratio)
			ctx.fillStyle = `rgb(${color.join(',')})`
			const [x, y] = getCoord(point)
			ctx.fillRect(x - space * 0.5, y - space * 0.5, space, space)
		}
	}
}

const drawCanvas = () => {
	ctx.fillStyle = '#444'
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	switch (viewMode) {
		case LABELS:
			drawViewMode()
			break
		case VALUES:
			drawValues()
			break
		case COLORS:
			drawColors()
			break
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
	if (!text) {
		const req = await fetch('./readings.txt')
		text = await req.text()
	}
	return text
		.trim()
		.split('\n')
		.map((l) =>
			l
				.trim()
				.replace(/\s+/g, ' ')
				.replace(/[^\s]+/g, (s) => s.padEnd(3, '  '))
				.trim()
		)
		.join('\n')
		.toUpperCase()
}

readings = await loadReadings()
readingsInput.value = readings

calculate()
resizeCanvas()
drawCanvas()

canvas.addEventListener('click', () => {
	const modeIndex = viewModes.indexOf(viewMode)
	viewMode = viewModes[(modeIndex + 1) % viewModes.length]
	drawCanvas()
})
