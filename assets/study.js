"use strict";

const depth = document.querySelector("#study-depth");
if (depth) {
  const lesson = document.querySelector(".lesson");
  const advanced = lesson.querySelector("[data-advanced]");
  const hint = document.querySelector("#depth-hint");
  const hints = {
    quick: "5～10 分钟 · 先看图解，再回忆核心公式和易错点。",
    standard: "15～30 分钟 · 操作图解、跟做例题，再做原题。",
    deep: "30～60 分钟以上 · 在标准内容上展开推导与适用条件。"
  };
  const applyDepth = (value) => {
    lesson.dataset.depth = value;
    depth.value = value;
    advanced.open = value === "deep";
    hint.textContent = hints[value];
  };
  let initial = "standard";
  try {
    const saved = localStorage.getItem("ml-study-depth");
    if (Object.hasOwn(hints, saved)) initial = saved;
  } catch {
    // The selector also works without local storage.
  }
  applyDepth(initial);
  depth.closest(".depth-picker").hidden = false;
  depth.addEventListener("change", () => {
    applyDepth(depth.value);
    try {
      localStorage.setItem("ml-study-depth", depth.value);
    } catch {
      // The selection still applies to the current lesson.
    }
  });
}

const blue = "#245ba1";
const green = "#167151";
const red = "#ac4736";
const purple = "#75549b";
const muted = "#52645c";

function element(tag, text, parent) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

function widget(host, options = {}) {
  const panel = element("div", undefined, host);
  if (options.title) element("h4", options.title, panel);
  const controls = element("div", undefined, panel);
  controls.className = "demo-controls";
  const output = element("output", undefined);
  output.className = "demo-result";
  let repaint;
  if (options.axes) {
    const canvas = element("canvas", options.description, panel);
    canvas.setAttribute("aria-hidden", "true");
    repaint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      options.draw(graph(ctx, width, height, options.axes));
    };
    const observer = new ResizeObserver(repaint);
    observer.observe(canvas);
  }
  const body = element("div", undefined, panel);
  panel.append(output);
  return { controls, body, output, repaint: () => repaint?.() };
}

function slider(parent, title, min, max, step, start, update) {
  const label = element("label", title, parent);
  label.className = "demo-slider";
  const input = element("input", undefined, label);
  Object.assign(input, { type: "range", min, max, step, value: start });
  input.addEventListener("input", update);
  return input;
}

function select(parent, title, options, update) {
  const label = element("label", title + " ", parent);
  const input = element("select", undefined, label);
  for (const [value, name] of options) {
    const option = element("option", name, input);
    option.value = value;
  }
  input.addEventListener("change", update);
  return input;
}

function action(parent, title, run) {
  const button = element("button", title, parent);
  button.type = "button";
  button.addEventListener("click", run);
  return button;
}

function playback(parent, step, atEnd, reset) {
  let timer;
  const play = action(parent, "播放", () => {
    if (timer) {
      stop();
      return;
    }
    if (atEnd()) reset();
    timer = setInterval(() => {
      step();
      if (atEnd()) stop();
    }, 500);
    play.textContent = "暂停";
  });
  play.hidden = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function stop() {
    clearInterval(timer);
    timer = undefined;
    play.textContent = "播放";
  }
  return stop;
}

function table(parent, caption, headings, rows) {
  const wrap = element("div", undefined, parent);
  wrap.className = "demo-table-wrap";
  const node = element("table", undefined, wrap);
  element("caption", caption, node);
  const header = element("tr", undefined, element("thead", undefined, node));
  for (const heading of headings) element("th", heading, header).scope = "col";
  const body = element("tbody", undefined, node);
  return rows.map((row) => {
    const tr = element("tr", undefined, body);
    return row.map((value, index) => {
      const cell = element(index === 0 ? "th" : "td", value, tr);
      if (index === 0) cell.scope = "row";
      return cell;
    });
  });
}

function graph(ctx, width, height, axes) {
  const { x, y, xLabel, yLabel, equal = false, topDown = false } = axes;
  const [xmin, xmax] = x;
  const [ymin, ymax] = y;
  const maxWidth = width - 66;
  const maxHeight = height - 63;
  const scale = Math.min(maxWidth / (xmax - xmin), maxHeight / (ymax - ymin));
  const w = equal ? (xmax - xmin) * scale : maxWidth;
  const h = equal ? (ymax - ymin) * scale : maxHeight;
  const left = 50 + (maxWidth - w) / 2;
  const top = 25;
  const cx = (value) => left + w * (value - xmin) / (xmax - xmin);
  const cy = (value) => top + h * (topDown ? value - ymin : ymax - value) / (ymax - ymin);
  const label = (value, posX, posY, align = "center") => {
    ctx.fillStyle = muted;
    ctx.font = "12px system-ui";
    ctx.textAlign = align;
    ctx.fillText(value, posX, posY);
  };
  ctx.strokeStyle = "#c5d2cc";
  ctx.strokeRect(left, top, w, h);
  label(yLabel, 11, 17, "left");
  label(xLabel, left + w / 2, height - 4);
  for (const i of [0, 0.5, 1]) {
    label(Number((xmin + i * (xmax - xmin)).toFixed(2)), left + i * w, top + h + 16);
    label(Number((ymin + i * (ymax - ymin)).toFixed(2)), left - 7, top + (topDown ? i : 1 - i) * h + 4, "right");
  }
  function clipped(draw) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, w, h);
    ctx.clip();
    draw();
    ctx.restore();
  }
  return {
    line(points, color, dashed = false, weight = 2) {
      clipped(() => {
        ctx.beginPath();
        points.forEach(([px, py], i) => i ? ctx.lineTo(cx(px), cy(py)) : ctx.moveTo(cx(px), cy(py)));
        ctx.strokeStyle = color;
        ctx.lineWidth = weight;
        if (dashed) ctx.setLineDash([5, 4]);
        ctx.stroke();
      });
    },
    dot(px, py, color, hollow = false, radius = 4.5) {
      clipped(() => {
        ctx.beginPath();
        ctx.arc(cx(px), cy(py), radius, 0, 2 * Math.PI);
        ctx.fillStyle = hollow ? "#f4f8f7" : color;
        ctx.fill();
        if (hollow) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    },
    box(px, py, boxWidth, boxHeight, color) {
      clipped(() => {
        ctx.fillStyle = color;
        ctx.fillRect(cx(px), cy(py + boxHeight), w * boxWidth / (xmax - xmin), h * boxHeight / (ymax - ymin));
      });
    }
  };
}

const samples = (min, max, fn, n = 90) => Array.from({ length: n + 1 }, (_, i) => {
  const x = min + i * (max - min) / n;
  return [x, fn(x)];
});
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const distance2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const number = (x, digits = 3) => Number(x.toFixed(digits)).toString();

function tasksDemo(host) {
  const { controls, body, output } = widget(host);
  const weather = [
    ["周一", 80, 3, 19, "有雨"], ["周二", 48, 1, 26, "无雨"],
    ["周三", 88, 4, 18, "有雨"], ["周四", 51, 2, 24, "无雨"]
  ];
  const goal = select(controls, "学习目标", [
    ["classify", "预测是否下雨"], ["regress", "预测气温"], ["cluster", "找相似天气"]
  ], render);
  function render() {
    const groups = goal.value === "cluster";
    const classify = goal.value === "classify";
    body.replaceChildren();
    const headings = ["日期", "湿度（%）", "风速（米/秒）"];
    if (!groups) headings.push(classify ? "历史是否下雨" : "历史气温（℃）");
    const cells = table(body, "同一份天气记录", headings, weather.map((row) => {
      const features = row.slice(0, 3);
      return groups ? features : [...features, row[classify ? 4 : 3]];
    }));
    for (const row of cells) if (!groups) row.at(-1).dataset.highlight = "";
    output.textContent = groups ? "聚类 · 只看湿度和风速，例如周一与周三可能分到同一组。"
      : classify ? "分类 · 过去的答案是有雨或无雨。" : "回归 · 过去的答案是可以比较差值的温度。";
  }
  render();
}

function matrixDemo(host) {
  const { controls, body, output } = widget(host);
  const a = [[1, 2, 3], [4, 5, 6]];
  const b = [[1, 0], [0, 1], [2, 1]];
  const row = select(controls, "结果的行", [[0, "第 1 行"], [1, "第 2 行"]], render);
  const column = select(controls, "结果的列", [[0, "第 1 列"], [1, "第 2 列"]], render);
  body.className = "matrix-pair";
  const left = table(body, "A · 2 行 × 3 列", ["行", "1", "2", "3"], a.map((r, i) => [i + 1, ...r]));
  const right = table(body, "B · 3 行 × 2 列", ["行", "1", "2"], b.map((r, i) => [i + 1, ...r]));
  function render() {
    const i = Number(row.value);
    const j = Number(column.value);
    left.forEach((r, k) => r.slice(1).forEach((cell) => cell.toggleAttribute("data-highlight", k === i)));
    right.forEach((r) => r.slice(1).forEach((cell, k) => cell.toggleAttribute("data-highlight", k === j)));
    const terms = a[i].map((value, k) => value * b[k][j]);
    output.textContent = `第 ${i + 1} 行第 ${j + 1} 列 = ${a[i].map((value, k) => `${value}×${b[k][j]}`).join(" + ")} = ${terms.reduce((sum, term) => sum + term, 0)}。结果有 2 行、2 列。`;
  }
  render();
}

const fitPoints = [[1, 2], [2, 4]];
const fitCost = (w) => 1.25 * (w - 2) ** 2;
function fitDemo(host) {
  const fit = widget(host, {
    axes: { x: [0, 2.4], y: [0, 9], xLabel: "面积（示意单位）", yLabel: "价格（示意单位）" },
    draw(g) {
      const w = slope.valueAsNumber;
      g.line([[0, 0], [2.4, 2.4 * w]], green);
      for (const [x, y] of fitPoints) {
        g.line([[x, y], [x, w * x]], red, true);
        g.dot(x, y, blue);
        g.dot(x, w * x, green, true, 3);
      }
    }
  });
  const slope = slider(fit.controls, "直线斜率", 0, 4, 0.1, 1, render);
  function render() {
    const w = slope.valueAsNumber;
    fit.repaint();
    fit.output.textContent = `面积乘 ${w.toFixed(1)} · 预测 ${number(w)}、${number(2 * w)} · 代价 ${fitCost(w).toFixed(3)}`;
  }
  render();
}

function descentDemo(host) {
  let path = [0];
  const valley = widget(host, {
    axes: { x: [-0.25, 4.25], y: [0, 6.5], xLabel: "直线斜率", yLabel: "代价" },
    draw(g) {
      g.line(samples(-0.25, 4.25, fitCost), blue);
      g.line(path.map((w) => [w, fitCost(w)]), green, true);
      path.forEach((w) => g.dot(w, fitCost(w), green, true, 3));
      g.dot(path.at(-1), fitCost(path.at(-1)), red);
    }
  });
  const rate = select(valley.controls, "学习率", [[0.2, "0.20"], [0.02, "0.02"], [0.6, "0.60"], [0.9, "0.90"]], reset);
  const next = action(valley.controls, "下降一步", step);
  const stop = playback(valley.controls, step, () => next.disabled, reset);
  action(valley.controls, "重置", reset);
  function step() {
    if (next.disabled) return;
    const w = path.at(-1);
    path.push(w - Number(rate.value) * 2.5 * (w - 2));
    render();
  }
  function reset() {
    stop();
    path = [0];
    render();
  }
  function render() {
    const w = path.at(-1);
    next.disabled = path.length >= 13 || fitCost(w) > 6.5;
    valley.repaint();
    const outside = fitCost(w) > 6.5 ? " · 越过谷底，已跳出图外" : "";
    valley.output.textContent = `第 ${path.length - 1} 步 · 斜率 ${number(w, 4)} · 代价 ${number(fitCost(w), 4)}${outside}`;
  }
  render();
}

function scalingDemo(host) {
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-1.9, 1.9], y: [-1.9, 1.9], xLabel: "第一个系数偏离最优值", yLabel: "第二个系数偏离最优值", equal: true },
    draw(g) {
      const k = Number(scale.value);
      for (const height of [0.18, 0.5, 1, 1.6]) {
        g.line(samples(0, 2 * Math.PI, Math.sin).map(([t, s]) => [
          height * Math.cos(t), height * s / Math.sqrt(k)
        ]), blue);
      }
      const points = [[1.4, 0.6]];
      for (let i = 0; i < steps.valueAsNumber; i++) {
        const [x, y] = points.at(-1);
        points.push([x * 0.92, y * (1 - 0.08 * k)]);
      }
      g.line(points, red);
      points.forEach(([x, y]) => g.dot(x, y, red, true, 3));
      g.dot(...points.at(-1), red);
    }
  });
  const scale = select(controls, "特征尺度", [[24, "缩放前 · 狭长"], [1, "缩放后 · 接近圆形"]], render);
  const steps = slider(controls, "更新次数", 0, 15, 1, 6, render);
  function render() {
    const n = steps.valueAsNumber;
    const k = Number(scale.value);
    const cost = (1.4 ** 2 * 0.92 ** (2 * n) + k * 0.6 ** 2 * (1 - 0.08 * k) ** (2 * n)) / 2;
    output.textContent = `第 ${n} 步 · 代价 ${number(cost)} · ${k === 1 ? "两方向平稳靠近中心" : "第二个系数每一步跨到谷底另一侧"}。`;
    repaint();
  }
  render();
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function sigmoidDemo(host) {
  const { controls, output, repaint } = widget(host, {
    axes: { x: [0, 4], y: [0, 1], xLabel: "输入 x", yLabel: "正类概率" },
    draw(g) {
      const t = threshold.valueAsNumber;
      const edge = 2 - Math.log(t / (1 - t));
      g.line(samples(0, 4, (x) => sigmoid(2 - x)), blue);
      g.line([[0, t], [4, t]], red, true);
      g.line([[edge, 0], [edge, t]], red, true);
      g.dot(input.valueAsNumber, sigmoid(2 - input.valueAsNumber), green);
    }
  });
  const input = slider(controls, "输入 x", 0, 4, 0.1, 1, render);
  const threshold = slider(controls, "分类阈值", 0.1, 0.9, 0.05, 0.5, render);
  function render() {
    const x = input.valueAsNumber;
    const p = sigmoid(2 - x);
    const t = threshold.valueAsNumber;
    const edge = 2 - Math.log(t / (1 - t));
    const edgeNote = edge < 0 || edge > 4 ? "（图外）" : "";
    output.textContent = `得分 ${number(2 - x)} → 概率 ${number(p)} → ${p >= t ? "正类" : "负类"} · 阈值 ${t} · 边界 x ≈ ${number(edge)}${edgeNote}`;
    repaint();
  }
  render();
}

function lossesDemo(host) {
  const square = (z) => (sigmoid(z) - 1) ** 2;
  const entropy = (z) => Math.log1p(Math.exp(-z));
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-6, 6], y: [0, 6.1], xLabel: "模型得分", yLabel: "真实为正类时的损失" },
    draw(g) {
      g.line(samples(-6, 6, square), purple, true);
      g.line(samples(-6, 6, entropy), green);
      g.dot(score.valueAsNumber, square(score.valueAsNumber), purple);
      g.dot(score.valueAsNumber, entropy(score.valueAsNumber), green);
    }
  });
  const score = slider(controls, "模型得分", -6, 6, 0.5, -4, render);
  function render() {
    const z = score.valueAsNumber;
    output.textContent = `得分 ${z} · 正类概率 ${number(sigmoid(z))} · 紫色虚线平方误差 ${number(square(z))} · 绿色实线交叉熵 ${number(entropy(z))}`;
    repaint();
  }
  render();
}

function ridgeFit(points, lambda) {
  const size = points.length;
  const system = Array.from({ length: size }, (_, j) => [
    ...Array.from({ length: size }, (_, k) => mean(points.map(([x]) => x ** (j + k))) + (j === k && j > 0 ? lambda : 0)),
    mean(points.map(([x, y]) => y * x ** j))
  ]);
  for (let j = 0; j < size; j++) {
    const pivot = system.reduce((best, row, k) => k >= j && Math.abs(row[j]) > Math.abs(system[best][j]) ? k : best, j);
    [system[j], system[pivot]] = [system[pivot], system[j]];
    const divisor = system[j][j];
    system[j] = system[j].map((value) => value / divisor);
    system.forEach((row, k) => {
      if (k !== j) system[k] = row.map((value, i) => value - row[j] * system[j][i]);
    });
  }
  return (x) => system.reduce((sum, row, j) => sum + row[size] * x ** j, 0);
}

function regularizationDemo(host) {
  const trend = (x) => 1 + x + 1.4 * x ** 2;
  const train = [-1, -0.78, -0.5, -0.16, 0.16, 0.5, 0.78, 1]
    .map((x, i) => [x, trend(x) + (i % 2 ? 0.19 : -0.19)]);
  const validation = [-0.9, -0.62, -0.33, 0, 0.33, 0.62, 0.9].map((x) => [x, trend(x)]);
  let predict;
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-1.05, 1.05], y: [0.1, 3.9], xLabel: "输入特征", yLabel: "观测值与预测值" },
    draw(g) {
      g.line(samples(-1, 1, predict), green);
      train.forEach(([x, y]) => g.dot(x, y, blue));
      validation.forEach(([x, y]) => g.dot(x, y, red, true, 3.5));
    }
  });
  const values = [0, 0.0001, 0.001, 0.02, 0.2, 2];
  const power = slider(controls, "惩罚强度（由弱到强）", 0, values.length - 1, 1, 0, render);
  function render() {
    const lambda = values[power.valueAsNumber];
    predict = ridgeFit(train, lambda);
    const mse = (points) => mean(points.map(([x, y]) => (predict(x) - y) ** 2));
    output.textContent = `λ = ${lambda} · 训练均方误差 ${number(mse(train), 4)} · 验证均方误差 ${number(mse(validation), 4)}`;
    repaint();
  }
  render();
}

function diagnosticDemo(host) {
  const sizes = [20, 40, 60, 80, 100, 120];
  const curves = {
    bias: [[14, 16, 17, 18, 18, 18], [28, 24, 22, 21, 20, 20]],
    variance: [[1, 2, 3, 4, 4, 5], [37, 29, 23, 19, 16, 14]],
    good: [[2, 3, 3, 4, 4, 4], [14, 10, 8, 7, 6, 6]]
  };
  const { controls, output, repaint } = widget(host, {
    axes: { x: [0, 120], y: [0, 40], xLabel: "训练样本数", yLabel: "误差（%）" },
    draw(g) {
      curves[model.value].forEach((series, j) => {
        const color = j ? red : blue;
        const points = series.map((y, i) => [sizes[i], y]);
        g.line(points, color, Boolean(j));
        g.dot(sizes[index.valueAsNumber], series[index.valueAsNumber], color);
      });
      g.line([[0, 5], [120, 5]], green, true);
    }
  });
  const model = select(controls, "学习曲线示例", [
    ["variance", "曲线一"], ["bias", "曲线二"], ["good", "曲线三"]
  ], render);
  const index = slider(controls, "样本规模（由少到多）", 0, sizes.length - 1, 1, 4, render);
  function render() {
    const i = index.valueAsNumber;
    const [train, validation] = curves[model.value];
    output.textContent = `${sizes[i]} 条样本 · 蓝色训练误差 ${train[i]}% · 红色虚线验证误差 ${validation[i]}% · 绿色基准 5%`;
    repaint();
  }
  render();
}

function metricsDemo(host) {
  const emails = [[0.1, 0], [0.2, 0], [0.34, 1], [0.42, 0], [0.58, 1], [0.67, 0], [0.82, 1], [0.92, 0]];
  const { controls, body, output, repaint } = widget(host, {
    axes: { x: [0, 1], y: [-0.35, 1.35], xLabel: "分类器打分", yLabel: "真实标签（上方为垃圾邮件）" },
    draw(g) {
      const t = threshold.valueAsNumber;
      g.line([[t, -0.35], [t, 1.35]], muted, true);
      emails.forEach(([score, label]) => g.dot(score, label, score >= t ? green : red, score < t));
    }
  });
  const threshold = slider(controls, "正类阈值", 0, 1, 0.05, 0.5, render);
  const [[, tp, fn], [, fp, tn]] = table(body, "混淆矩阵", ["真实类别", "预测正类", "预测负类"], [
    ["正类", "", ""], ["负类", "", ""]
  ]);
  const percent = (n, d) => d ? `${number(100 * n / d, 1)}%` : "未定义";
  function render() {
    const t = threshold.valueAsNumber;
    const truePositive = emails.filter(([p, y]) => p >= t && y === 1).length;
    const falsePositive = emails.filter(([p, y]) => p >= t && y === 0).length;
    const falseNegative = emails.filter(([p, y]) => p < t && y === 1).length;
    const trueNegative = emails.length - truePositive - falsePositive - falseNegative;
    tp.textContent = `TP ${truePositive}`;
    fp.textContent = `FP ${falsePositive}`;
    fn.textContent = `FN ${falseNegative}`;
    tn.textContent = `TN ${trueNegative}`;
    output.textContent = `阈值 ${t} · 准确率 ${percent(truePositive + trueNegative, emails.length)} · 精确率 ${percent(truePositive, truePositive + falsePositive)} · 召回率 ${percent(truePositive, truePositive + falseNegative)} · F1 ${percent(2 * truePositive, 2 * truePositive + falsePositive + falseNegative)}`;
    repaint();
  }
  render();
}

function marginDemo(host) {
  const points = [[-3, 1, -1], [-1, -1, -1], [-2, 0.5, -1], [1, 1, 1], [2, -0.8, 1], [2.6, 0.2, 1]];
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-3.5, 3.5], y: [-2, 2], xLabel: "特征 1", yLabel: "特征 2", equal: true },
    draw(g) {
      const x = boundary.valueAsNumber;
      const half = 1 - Math.abs(x);
      g.box(x - half, -2, 2 * half, 4, "#dbece5");
      g.line([[x, -2], [x, 2]], green);
      for (const [px, py, label] of positions()) {
        if (Math.abs(label * (px - x) - half) < 1e-8) g.dot(px, py, muted, true, 7);
        g.dot(px, py, label === 1 ? blue : red, label === -1);
      }
    }
  });
  const boundary = slider(controls, "左右移动边界", -0.9, 0.9, 0.1, 0.6, render);
  const outlier = select(controls, "训练数据", [[0, "两类可以分开"], [1, "加入一个越界负类点"]], render);
  function positions() {
    return outlier.value === "1" ? [...points, [0.9, -0.35, -1]] : points;
  }
  function render() {
    const x = boundary.valueAsNumber;
    const half = 1 - Math.abs(x);
    const violations = positions().filter(([px, , label]) => label * (px - x) < half - 1e-8).length;
    output.textContent = `边界 ${number(x)} · 原样本的安全带总宽 ${number(2 * half)} · 落在带内或错侧的样本 ${violations} 个`;
    repaint();
  }
  render();
}

function kernelDemo(host) {
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-3, 3], y: [-2.3, 2.3], xLabel: "特征 1", yLabel: "特征 2", equal: true },
    draw(g) {
      const radius = Math.sqrt(2 * spread.valueAsNumber * Math.log(2));
      g.line(samples(0, 2 * Math.PI, Math.sin).map(([t, s]) => [radius * Math.cos(t), radius * s]), green);
      g.dot(0, 0, blue);
      g.dot(1, 0, red, true);
    }
  });
  const spread = slider(controls, "核宽度 σ²", 0.25, 2, 0.25, 1, render);
  function render() {
    const value = spread.valueAsNumber;
    output.textContent = `σ² = ${value} · 红点距蓝色参考点 1 单位，相似度 ${number(Math.exp(-1 / (2 * value)))} · 绿色边界半径 ${number(Math.sqrt(2 * value * Math.log(2)))}`;
    repaint();
  }
  render();
}

function clusteringDemo(host) {
  const points = [[0, 0], [1, 1], [2, 0], [7, 3], [8, 2], [9, 3]];
  const colors = [blue, red];
  let centers;
  let groups;
  let phase;
  let iteration;
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-1, 10], y: [-1, 4], xLabel: "特征 1", yLabel: "特征 2", equal: true },
    draw(g) {
      points.forEach(([x, y], i) => {
        const group = groups[i];
        if (group !== undefined) g.line([[x, y], centers[group]], colors[group], true, 1);
        g.dot(x, y, colors[group] || muted);
      });
      centers.forEach(([x, y], i) => g.dot(x, y, colors[i], true, 7));
    }
  });
  const initial = select(controls, "初始中心", [[0, "两个中心都在左边"], [1, "左右各一个中心"]], reset);
  const next = action(controls, "分配到最近中心", step);
  const stop = playback(controls, step, () => next.disabled, reset);
  action(controls, "重置", reset);
  function reset() {
    stop();
    centers = initial.value === "0" ? [points[0], points[1]] : [points[0], points[3]];
    groups = [];
    phase = "assign";
    iteration = 0;
    render();
  }
  function step() {
    if (next.disabled) return;
    if (phase === "assign") {
      const assigned = points.map((point) => distance2(point, centers[0]) <= distance2(point, centers[1]) ? 0 : 1);
      phase = assigned.every((group, i) => group === groups[i]) ? "done" : "move";
      groups = assigned;
    } else {
      centers = centers.map((center, j) => {
        const members = points.filter((_, i) => groups[i] === j);
        return members.length ? [mean(members.map(([x]) => x)), mean(members.map(([, y]) => y))] : center;
      });
      phase = "assign";
      iteration++;
    }
    render();
  }
  function render() {
    next.disabled = phase === "done";
    if (next.disabled) stop();
    next.textContent = { assign: "分配到最近中心", move: "移到组内均值", done: "分组已稳定" }[phase];
    const positions = centers.map(([x, y]) => `(${number(x)}, ${number(y)})`).join("、");
    const cost = groups.length ? number(mean(points.map((point, i) => distance2(point, centers[groups[i]])))) : "待分配";
    output.textContent = `已更新中心 ${iteration} 轮 · 蓝、红两组中心 ${positions} · 平均平方距离 ${cost}`;
    repaint();
  }
  reset();
}

function pcaDemo(host) {
  const points = [[-3, -2], [-2, -3], [-1, 0], [0, -1], [1, 0], [0, 1], [2, 3], [3, 2]];
  const variance = mean(points.map(([x, y]) => x * x + y * y));
  const unit = () => {
    const radians = angle.valueAsNumber * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians)];
  };
  const project = ([x, y], [u, v]) => (x * u + y * v);
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-4, 4], y: [-4, 4], xLabel: "中心化特征 1", yLabel: "中心化特征 2", equal: true },
    draw(g) {
      const [u, v] = unit();
      g.line([[-6 * u, -6 * v], [6 * u, 6 * v]], green);
      for (const point of points) {
        const coordinate = project(point, [u, v]);
        const estimate = [coordinate * u, coordinate * v];
        g.line([point, estimate], red, true);
        g.dot(...point, blue, false, 3.5);
        g.dot(...estimate, green, true, 3.5);
      }
    }
  });
  const angle = slider(controls, "投影轴角度", 0, 180, 5, 0, render);
  function render() {
    const kept = mean(points.map((point) => project(point, unit()) ** 2));
    output.textContent = `轴角度 ${angle.valueAsNumber}° · 投影方差 ${number(kept)} · 保留 ${number(100 * kept / variance, 1)}% · 平均重建平方误差 ${number(variance - kept)}`;
    repaint();
  }
  render();
}

const gaussian = (x, mu, sigma) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));

function anomalyDemo(host) {
  const { controls, output, repaint } = widget(host, {
    axes: { x: [4, 16], y: [0, 0.52], xLabel: "传感器读数", yLabel: "正常模型密度" },
    draw(g) {
      const width = scale.valueAsNumber;
      const x = reading.valueAsNumber;
      const cutoff = epsilon.valueAsNumber;
      const values = samples(4, 16, (z) => gaussian(z, 10, width), 120);
      values.forEach(([z, density]) => {
        if (density < cutoff) g.box(z, 0, 0.101, 0.52, "#f5e4df");
      });
      g.line(values, blue);
      g.line([[4, cutoff], [16, cutoff]], red, true);
      g.dot(x, gaussian(x, 10, width), green);
    }
  });
  const scale = slider(controls, "正常波动（标准差 σ）", 0.8, 3, 0.1, 1.6, render);
  const epsilon = slider(controls, "异常阈值 ε", 0.01, 0.2, 0.01, 0.05, render);
  const reading = slider(controls, "待检读数", 4, 16, 0.5, 14, render);
  function render() {
    const p = gaussian(reading.valueAsNumber, 10, scale.valueAsNumber);
    output.textContent = `标准差 ${scale.valueAsNumber} · 读数 ${reading.valueAsNumber} · 密度 ${number(p, 4)} · 阈值 ${epsilon.valueAsNumber} · ${p < epsilon.valueAsNumber ? "标记，等待核查" : "未标记"}`;
    repaint();
  }
  render();
}

function recommendationDemo(host) {
  const ratings = [[2, 4], [1, 2], [2, null]];
  const { controls, body, output } = widget(host);
  const observed = table(body, "评分表（高亮为待预测）", ["电影", "用户 A", "用户 B"],
    ratings.map((row, i) => [`电影 ${i + 1}`, ...row.map((value) => value ?? "？")]));
  observed[2][2].dataset.highlight = "";
  let movies;
  let users;
  let iteration;
  const known = ratings.flatMap((row, i) => row.flatMap((value, j) => value === null ? [] : [[i, j, value]]));
  const next = action(controls, "同时更新两组系数", step);
  action(controls, "重置", reset);
  function reset() {
    movies = [2, 3, 1];
    users = [1, 1];
    iteration = 0;
    render();
  }
  function step() {
    const dMovie = movies.map(() => 0);
    const dUser = users.map(() => 0);
    for (const [i, j, score] of known) {
      const error = movies[i] * users[j] - score;
      dMovie[i] += error * users[j];
      dUser[j] += error * movies[i];
    }
    movies = movies.map((value, i) => value - 0.12 * dMovie[i] / known.length);
    users = users.map((value, j) => value - 0.12 * dUser[j] / known.length);
    iteration++;
    render();
  }
  function render() {
    const mse = mean(known.map(([i, j, y]) => (movies[i] * users[j] - y) ** 2));
    next.disabled = iteration >= 40;
    observed[2][2].textContent = `预测 ${number(movies[2] * users[1], 2)}`;
    output.textContent = `第 ${iteration} 轮 · 物品系数 ${movies.map((value) => number(value, 3)).join("、")} · 用户系数 ${users.map((value) => number(value, 3)).join("、")} · 已知评分均方误差 ${number(mse, 3)}`;
  }
  reset();
}

function batchesDemo(host) {
  const minima = [[-2, 1], [-1, -2], [0, 2], [2, 2], [1, -1], [1, 0]];
  const optimum = [mean(minima.map(([x]) => x)), mean(minima.map(([, y]) => y))];
  const colors = [blue, green, red];
  const sizes = [6, 2, 1];
  let traces;
  const { controls, output, repaint } = widget(host, {
    axes: { x: [-3.2, 2.7], y: [-2.1, 2.7], xLabel: "参数 1", yLabel: "参数 2", equal: true },
    draw(g) {
      for (const radius of [0.4, 0.9, 1.6, 2.5]) {
        g.line(samples(0, 2 * Math.PI, Math.sin).map(([t, s]) => [
          optimum[0] + radius * Math.cos(t), optimum[1] + radius * s
        ]), "#c4d3ca");
      }
      traces.forEach((trace, j) => {
        g.line(trace, colors[j], j === 2);
        g.dot(...trace.at(-1), colors[j], Boolean(j), 4);
      });
      g.dot(...optimum, muted, false, 3);
    }
  });
  const epochs = slider(controls, "完整读过数据的轮数", 0, 6, 1, 2, render);
  function render() {
    const n = epochs.valueAsNumber;
    traces = sizes.map((size) => {
      const trace = [[-2.8, 2.3]];
      for (let i = 0; i < minima.length * n; i += size) {
        const begin = i % minima.length;
        const batch = minima.slice(begin, begin + size);
        const [x, y] = trace.at(-1);
        trace.push([x - 0.42 * (x - mean(batch.map((point) => point[0]))),
          y - 0.42 * (y - mean(batch.map((point) => point[1])))]);
      }
      return trace;
    });
    output.textContent = `各读过 ${n * minima.length} 条样本 · 蓝色 BGD 更新 ${n} 次 · 绿色小批量更新 ${3 * n} 次 · 红色虚线 SGD 更新 ${6 * n} 次`;
    repaint();
  }
  render();
}

function windowsDemo(host) {
  const imageSize = 10;
  let position = 0;
  const { controls, output, repaint } = widget(host, {
    axes: { x: [0, 10], y: [0, 10], xLabel: "图像横坐标", yLabel: "图像纵坐标（从上往下计数）", equal: true, topDown: true },
    draw(g) {
      g.box(1.7, 3.4, 0.85, 3.2, muted);
      g.box(1.7, 4.6, 2.45, 0.65, muted);
      g.box(3.3, 3.4, 0.85, 3.2, muted);
      g.box(5.6, 3.4, 0.88, 2.22, muted);
      g.box(5.6, 6.01, 0.88, 0.6, muted);
      const [x, y, side] = windowPosition();
      g.box(x, y, side, side, "#378a6650");
      g.line([[x, y], [x + side, y], [x + side, y + side], [x, y + side], [x, y]], green, false, 3);
    }
  });
  const stride = select(controls, "步长（像素）", [[2, "2"], [1, "1"], [3, "3"]], reset);
  const windowSize = select(controls, "窗口边长（像素）", [[4, "4"], [6, "6"]], reset);
  const next = action(controls, "下一位置", step);
  const stop = playback(controls, step, () => next.disabled, reset);
  action(controls, "从起点重置", reset);
  function count() {
    return Math.floor((imageSize - Number(windowSize.value)) / Number(stride.value)) + 1;
  }
  function windowPosition() {
    const stepSize = Number(stride.value);
    return [position % count() * stepSize, Math.floor(position / count()) * stepSize, Number(windowSize.value)];
  }
  function step() {
    position = Math.min(position + 1, count() ** 2 - 1);
    render();
    if (next.disabled) stop();
  }
  function reset() {
    stop();
    position = 0;
    render();
  }
  function render() {
    const [x, y] = windowPosition();
    next.disabled = position === count() ** 2 - 1;
    output.textContent = `窗口左上角 (${x}, ${y}) · 第 ${position + 1} 个位置 · 横纵各 ${count()} 个起点，共 ${count() ** 2} 个位置`;
    repaint();
  }
  render();
}

function pipelineDemo(host) {
  const { controls, output } = widget(host);
  const stages = ["原始系统", "定位文字", "切分字符", "识别字符"];
  const accuracy = [65, 70, 85, 100];
  const stage = select(controls, "已提供正确输出的阶段", stages.map((name, i) => [
    i, name === "原始系统" ? name : stages.slice(1, i + 1).join(" → ")
  ]), render);
  function render() {
    const i = Number(stage.value);
    const gain = i ? ` · 此次替换带来 ${accuracy[i] - accuracy[i - 1]} 个百分点` : "";
    output.textContent = `定位文字 → 切分字符 → 识别字符 · 端到端准确率 ${accuracy[i]}%${gain}`;
  }
  render();
}

const demos = {
  tasks: tasksDemo, matrix: matrixDemo, fit: fitDemo, descent: descentDemo,
  scaling: scalingDemo, sigmoid: sigmoidDemo, losses: lossesDemo,
  regularization: regularizationDemo, diagnostics: diagnosticDemo, metrics: metricsDemo,
  margin: marginDemo, kernel: kernelDemo, clustering: clusteringDemo, pca: pcaDemo,
  anomaly: anomalyDemo, recommendation: recommendationDemo, batches: batchesDemo,
  windows: windowsDemo, pipeline: pipelineDemo
};

for (const host of document.querySelectorAll("[data-demo]")) {
  demos[host.dataset.demo](host);
}
