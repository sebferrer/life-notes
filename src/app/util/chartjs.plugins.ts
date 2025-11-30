export const CHART_JS_PLUGINS = new Map([
	['horizontalLine', {
		afterDraw(chartInstance: any) {
			const yScale = chartInstance.scales['y-axis-0'];
			const canvas = chartInstance.chart;
			const ctx = canvas.ctx;
			let index;
			let line;
			let style;
			let yValue;

			if (chartInstance.options.horizontalLine) {
				for (index = 0; index < chartInstance.options.horizontalLine.length; index++) {
					line = chartInstance.options.horizontalLine[index];

					if (!line.style) {
						style = 'rgba(169,169,169, .6)';
					} else {
						style = line.style;
					}

					if (line.y != null) {
						yValue = yScale.getPixelForValue(line.y);
					} else {
						yValue = 0;
					}

					ctx.lineWidth = 1;

					if (yValue) {
						ctx.beginPath();
						ctx.moveTo(45, yValue);
						ctx.lineTo(canvas.width - 9, yValue);
						ctx.strokeStyle = style;
						ctx.stroke();
					}

					if (line.text) {
						ctx.fillStyle = style;
						ctx.fillText(line.text, 0, yValue + ctx.lineWidth);
					}
				}
				return;
			};
		}
	}]
]);
