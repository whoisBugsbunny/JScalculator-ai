"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const HISTORY_KEY = "calcwork.history.v1";
const SETTINGS_KEY = "calcwork.settings.v1";
const DEFAULT_PAGE_TITLE = "Calcwork | Precision calculator";
const DEFAULT_PAGE_HEADING = "Make the numbers work.";
const units = {
    length: { meter: ["Meters", 1], kilometer: ["Kilometers", 1000], centimeter: ["Centimeters", 0.01], millimeter: ["Millimeters", 0.001], mile: ["Miles", 1609.344], yard: ["Yards", 0.9144], foot: ["Feet", 0.3048], inch: ["Inches", 0.0254] },
    mass: { kilogram: ["Kilograms", 1], gram: ["Grams", 0.001], milligram: ["Milligrams", 0.000001], pound: ["Pounds", 0.45359237], ounce: ["Ounces", 0.028349523125], tonne: ["Metric tonnes", 1000] },
    temperature: { celsius: ["Celsius"], fahrenheit: ["Fahrenheit"], kelvin: ["Kelvin"] },
    area: { sqm: ["Square meters", 1], sqft: ["Square feet", 0.09290304], hectare: ["Hectares", 10000], acre: ["Acres", 4046.8564224], sqkm: ["Square kilometers", 1000000] },
    volume: { liter: ["Liters", 1], milliliter: ["Milliliters", 0.001], cubicmeter: ["Cubic meters", 1000], gallon: ["US gallons", 3.785411784], quart: ["US quarts", 0.946352946], cup: ["US cups", 0.2365882365] },
    speed: { mps: ["Meters / second", 1], kph: ["Kilometers / hour", 0.2777777778], mph: ["Miles / hour", 0.44704], knot: ["Knots", 0.5144444444] },
    time: { second: ["Seconds", 1], minute: ["Minutes", 60], hour: ["Hours", 3600], day: ["Days", 86400], week: ["Weeks", 604800] },
    data: { byte: ["Bytes", 1], kilobyte: ["Kilobytes", 1000], megabyte: ["Megabytes", 1e6], gigabyte: ["Gigabytes", 1e9], kibibyte: ["Kibibytes", 1024], mebibyte: ["Mebibytes", 1048576], gibibyte: ["Gibibytes", 1073741824] }
};
const formulas = [
    {
        id: "compound-interest", category: "Finance", name: "Compound interest", keywords: "investment savings growth future value",
        equation: "A = P(1 + r/n)^(nt)", description: "Estimate an investment or savings balance with interest compounded at regular intervals.",
        fields: [["principal", "Starting amount", 10000], ["rate", "Annual rate (%)", 5], ["frequency", "Compounds per year", 12], ["years", "Years", 10]],
        calculate: ({ principal, rate, frequency, years }) => {
            const amount = principal * Math.pow(1 + rate / 100 / frequency, frequency * years);
            return { value: amount, display: formatCurrency(amount), detail: `Interest earned: ${formatCurrency(amount - principal)}`, expression: `(${principal}*(1+${rate}/100/${frequency})^(${frequency}*${years}))` };
        }
    },
    {
        id: "simple-interest", category: "Finance", name: "Simple interest", keywords: "principal rate time loan",
        equation: "I = P × r × t", description: "Calculate interest that is applied only to the original principal.",
        fields: [["principal", "Principal", 5000], ["rate", "Annual rate (%)", 6], ["years", "Years", 3]],
        calculate: ({ principal, rate, years }) => {
            const interest = principal * rate / 100 * years;
            return { value: principal + interest, display: formatCurrency(principal + interest), detail: `Interest: ${formatCurrency(interest)} · Total: ${formatCurrency(principal + interest)}`, expression: `(${principal}+${principal}*${rate}/100*${years})` };
        }
    },
    {
        id: "return-on-investment", category: "Finance", name: "Return on investment", keywords: "ROI profit gain percentage",
        equation: "ROI = (current value − cost) / cost × 100", description: "Measure investment gain or loss as a percentage of the original cost.",
        fields: [["cost", "Initial investment", 1000], ["current", "Current value", 1250]],
        calculate: ({ cost, current }) => {
            const roi = cost === 0 ? NaN : (current - cost) / cost * 100;
            return { value: roi, display: Number.isFinite(roi) ? `${formatNumber(roi, 2)}%` : "Initial investment must be non-zero", detail: `Net change: ${formatCurrency(current - cost)}`, expression: `((${current}-${cost})/${cost}*100)` };
        }
    },
    {
        id: "break-even", category: "Finance", name: "Break-even quantity", keywords: "business fixed variable costs units",
        equation: "Units = fixed costs / (price − variable cost)", description: "Find the number of units to sell before revenue covers fixed and variable costs.",
        fields: [["fixed", "Fixed costs", 10000], ["price", "Price per unit", 50], ["variable", "Variable cost per unit", 30]],
        calculate: ({ fixed, price, variable }) => {
            const contribution = price - variable;
            const units = contribution <= 0 ? NaN : fixed / contribution;
            return { value: units, display: Number.isFinite(units) ? `${formatNumber(Math.ceil(units))} units` : "Price must exceed variable cost", detail: `Contribution per unit: ${formatCurrency(contribution)}`, expression: `ceil(${fixed}/(${price}-${variable}))` };
        }
    },
    {
        id: "bmi", category: "Everyday", name: "Body mass index", keywords: "BMI health weight height",
        equation: "BMI = mass (kg) / height² (m)", description: "Calculate BMI from kilograms and meters. This is a screening measure, not a diagnosis.",
        fields: [["mass", "Mass (kg)", 70], ["height", "Height (m)", 1.75]],
        calculate: ({ mass, height }) => {
            const bmi = height === 0 ? NaN : mass / (height * height);
            return { value: bmi, display: Number.isFinite(bmi) ? formatNumber(bmi, 2) : "Height must be non-zero", detail: "BMI does not account for body composition or replace clinical advice.", expression: `(${mass}/(${height}^2))` };
        }
    },
    {
        id: "speed", category: "Physics", name: "Average speed", keywords: "distance time velocity",
        equation: "v = distance / time", description: "Find average speed from total distance traveled and elapsed time.",
        fields: [["distance", "Distance (m)", 1000], ["time", "Time (s)", 120]],
        calculate: ({ distance, time }) => {
            const speed = time === 0 ? NaN : distance / time;
            return { value: speed, display: Number.isFinite(speed) ? `${formatNumber(speed, 4)} m/s` : "Time must be non-zero", detail: Number.isFinite(speed) ? `${formatNumber(speed * 3.6, 2)} km/h` : "", expression: `(${distance}/${time})` };
        }
    },
    {
        id: "force", category: "Physics", name: "Force", keywords: "newton mass acceleration",
        equation: "F = m × a", description: "Calculate net force from mass and acceleration (Newton's second law).",
        fields: [["mass", "Mass (kg)", 10], ["acceleration", "Acceleration (m/s²)", 9.81]],
        calculate: ({ mass, acceleration }) => ({ value: mass * acceleration, display: `${formatNumber(mass * acceleration, 4)} N`, detail: "1 newton = 1 kg·m/s²", expression: `(${mass}*${acceleration})` })
    },
    {
        id: "kinetic-energy", category: "Physics", name: "Kinetic energy", keywords: "joules movement velocity",
        equation: "KE = ½ × m × v²", description: "Calculate the kinetic energy of a moving object.",
        fields: [["mass", "Mass (kg)", 2], ["velocity", "Velocity (m/s)", 10]],
        calculate: ({ mass, velocity }) => ({ value: 0.5 * mass * velocity * velocity, display: `${formatNumber(0.5 * mass * velocity * velocity, 4)} J`, detail: "1 joule = 1 kg·m²/s²", expression: `(0.5*${mass}*${velocity}^2)` })
    },
    {
        id: "density", category: "Physics", name: "Density", keywords: "mass volume material",
        equation: "ρ = mass / volume", description: "Find mass per unit volume. Enter mass in kilograms and volume in cubic meters.",
        fields: [["mass", "Mass (kg)", 1], ["volume", "Volume (m³)", 0.001]],
        calculate: ({ mass, volume }) => {
            const density = volume === 0 ? NaN : mass / volume;
            return { value: density, display: Number.isFinite(density) ? `${formatNumber(density, 4)} kg/m³` : "Volume must be non-zero", detail: "Units follow the mass and volume units entered.", expression: `(${mass}/${volume})` };
        }
    },
    {
        id: "ohms-law", category: "Physics", name: "Ohm's law", keywords: "voltage current resistance power electricity",
        equation: "R = V / I   ·   P = V × I", description: "Calculate resistance and power from voltage and current.",
        fields: [["voltage", "Voltage (V)", 12], ["current", "Current (A)", 2]],
        calculate: ({ voltage, current }) => {
            const resistance = current === 0 ? NaN : voltage / current;
            return { value: resistance, display: Number.isFinite(resistance) ? `${formatNumber(resistance, 4)} Ω` : "Current must be non-zero", detail: `Power: ${formatNumber(voltage * current, 4)} W`, expression: `(${voltage}/${current})` };
        }
    },
    {
        id: "weighted-mean", category: "Statistics", name: "Weighted mean", keywords: "average data grades scores",
        equation: "x̄ = Σ(value × weight) / Σ(weight)", description: "Combine two values while giving each a different relative weight.",
        fields: [["value1", "Value A", 80], ["weight1", "Weight A", 40], ["value2", "Value B", 90], ["weight2", "Weight B", 60]],
        calculate: ({ value1, weight1, value2, weight2 }) => {
            const totalWeight = weight1 + weight2;
            const mean = totalWeight === 0 ? NaN : (value1 * weight1 + value2 * weight2) / totalWeight;
            return { value: mean, display: Number.isFinite(mean) ? formatNumber(mean, 4) : "Total weight must be non-zero", detail: `Combined weight: ${formatNumber(totalWeight)}`, expression: `((${value1}*${weight1}+${value2}*${weight2})/(${weight1}+${weight2}))` };
        }
    },
    {
        id: "percent-change", category: "Statistics", name: "Percentage change", keywords: "increase decrease growth comparison",
        equation: "Change % = (new − old) / |old| × 100", description: "Compare a new value with an original value as a percentage increase or decrease.",
        fields: [["original", "Original value", 80], ["next", "New value", 100]],
        calculate: ({ original, next }) => {
            const change = original === 0 ? NaN : (next - original) / Math.abs(original) * 100;
            return { value: change, display: Number.isFinite(change) ? `${formatNumber(change, 2)}%` : "Original value must be non-zero", detail: `Absolute change: ${formatNumber(next - original)}`, expression: `((${next}-${original})/abs(${original})*100)` };
        }
    }
];

let mode = "standard";
let angle = "DEG";
let numberBase = 10;
let businessMode = "percent";
let currencyCode = "USD";
let lastAnswer = 0;
let currentValue = 0;
let memoryValue = 0;
let hasResult = false;
let xValue = null;
const graph = { cx: 0, cy: 0, scale: 40 };
let history = loadHistory();
let selectedFormulaId = "compound-interest";
let selectedFormulaResult = null;

function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(saved) ? saved.slice(0, 100) : [];
    } catch {
        return [];
    }
}

function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Storage may be disabled. */ }
}

function formatNumber(value, maximumFractionDigits = 12) {
    if (!Number.isFinite(value)) return String(value);
    if (Object.is(value, -0) || Math.abs(value) < 1e-14) value = 0;
    if (Math.abs(value) >= 1e15 || (value !== 0 && Math.abs(value) < 1e-9)) return value.toExponential(Math.min(maximumFractionDigits, 10)).replace(/\.?0+e/, "e");
    return new Intl.NumberFormat("en-US", { maximumFractionDigits, useGrouping: true }).format(value);
}

function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}

function tokenize(source, base) {
    const tokens = [];
    let position = 0;
    while (position < source.length) {
        if (/\s/.test(source[position])) { position++; continue; }
        const rest = source.slice(position);
        const number = base === 10 ? rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i) : rest.match(/^[0-9a-f]+/i);
        if (number) {
            tokens.push({ type: "number", value: number[0] });
            position += number[0].length;
            continue;
        }
        const identifier = rest.match(/^[a-zA-Z]+/);
        if (identifier) {
            tokens.push({ type: "identifier", value: identifier[0].toLowerCase() });
            position += identifier[0].length;
            continue;
        }
        const operator = ["<<", ">>"].find((candidate) => rest.startsWith(candidate));
        if (operator || "+-*/%^!&|~(),".includes(source[position])) {
            const value = operator || source[position];
            tokens.push({ type: "operator", value });
            position += value.length;
            continue;
        }
        throw new Error(`Unexpected character: ${source[position]}`);
    }
    tokens.push({ type: "end", value: "" });
    return tokens;
}

function evaluateExpression(source) {
    const tokens = tokenize(source, mode === "programmer" ? numberBase : 10);
    let cursor = 0;
    const peek = () => tokens[cursor];
    const take = () => tokens[cursor++];
    const precedence = { "|": 1, xor: 2, "&": 3, "<<": 4, ">>": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, mod: 6, "^": 8 };

    function primary() {
        const token = take();
        if (token.type === "number") {
            const value = mode === "programmer" ? Number.parseInt(token.value, numberBase) : Number(token.value);
            if (!Number.isFinite(value)) throw new Error("That number is outside the supported range.");
            return value;
        }
        if (token.value === "(") {
            const value = expression(0);
            if (take().value !== ")") throw new Error("Add a closing parenthesis.");
            return value;
        }
        if (["+", "-", "~"].includes(token.value)) {
            const value = expression(7);
            if (token.value === "~") return ~Math.trunc(value);
            return token.value === "-" ? -value : value;
        }
        if (token.type === "identifier") {
            if (mode === "programmer" && numberBase > 10 && /^[a-f]+$/.test(token.value)) return Number.parseInt(token.value, numberBase);
            if (token.value === "x" && xValue !== null) return xValue;
            if (token.value === "pi") return Math.PI;
            if (token.value === "e") return Math.E;
            if (token.value === "ans") return lastAnswer;
            if (token.value === "mem") return memoryValue;
            if (token.value === "xor") throw new Error("XOR needs a value on both sides.");
            if (takeIf("(")) {
                const args = [];
                if (peek().value !== ")") {
                    do { args.push(expression(0)); } while (takeIf(","));
                }
                if (take().value !== ")") throw new Error("Add a closing parenthesis.");
                return callFunction(token.value, args);
            }
            throw new Error(`Unknown value: ${token.value}`);
        }
        throw new Error("Enter a number or a complete expression.");
    }

    function takeIf(value) {
        if (peek().value !== value) return false;
        take();
        return true;
    }

    function expression(minimumPrecedence) {
        let left = primary();
        while (peek().value === "!" || peek().value === "%") {
            const postfix = take().value;
            if (postfix === "%") left /= 100;
            else {
                if (!Number.isInteger(left) || left < 0 || left > 170) throw new Error("Factorial requires a whole number from 0 to 170.");
                let factorial = 1;
                for (let factor = 2; factor <= left; factor++) factorial *= factor;
                left = factorial;
            }
        }
        while (true) {
            const next = peek();
            const operator = next.value === "xor" ? "xor" : next.value;
            let priority = precedence[operator];
            const implicitMultiplication = priority === undefined && (next.type === "number" || next.value === "(" || (next.type === "identifier" && !["mod", "xor"].includes(next.value)));
            if (implicitMultiplication) priority = 6;
            if (priority === undefined || priority < minimumPrecedence) break;
            if (!implicitMultiplication) take();
            const right = expression(priority + (operator === "^" ? 0 : 1));
            if (implicitMultiplication) left *= right;
            else if (["&", "|", "xor", "<<", ">>"].includes(operator)) {
                const a = Math.trunc(left); const b = Math.trunc(right);
                left = operator === "&" ? a & b : operator === "|" ? a | b : operator === "xor" ? a ^ b : operator === "<<" ? a << b : a >> b;
            } else if (operator === "+") left += right;
            else if (operator === "-") left -= right;
            else if (operator === "*") left *= right;
            else if (operator === "/") { if (right === 0) throw new Error("Division by zero is undefined."); left /= right; }
            else if (operator === "%" || operator === "mod") { if (right === 0) throw new Error("Remainder by zero is undefined."); left %= right; }
            else if (operator === "^") left = Math.pow(left, right);
            if (Number.isNaN(left)) throw new Error("This expression has no real-number result.");
        }
        return left;
    }

    if (!source.trim()) throw new Error("Enter an expression to calculate.");
    const result = expression(0);
    if (peek().type !== "end") throw new Error(`Check this part of the expression: ${peek().value}`);
    if (!Number.isFinite(result)) throw new Error("The result is outside the supported range.");
    return result;
}

function callFunction(name, args) {
    if (args.length !== 1) throw new Error(`${name}() needs one value.`);
    const value = args[0];
    const radians = angle === "DEG" ? value * Math.PI / 180 : value;
    const toAngle = angle === "DEG" ? 180 / Math.PI : 1;
    const functions = {
        sin: () => Math.sin(radians), cos: () => Math.cos(radians), tan: () => (Math.abs(Math.cos(radians)) < 1e-12 ? NaN : Math.tan(radians)),
        asin: () => Math.asin(value) * toAngle, acos: () => Math.acos(value) * toAngle, atan: () => Math.atan(value) * toAngle,
        sqrt: () => Math.sqrt(value), cbrt: () => Math.cbrt(value), abs: () => Math.abs(value),
        log: () => Math.log10(value), ln: () => Math.log(value), exp: () => Math.exp(value),
        floor: () => Math.floor(value), ceil: () => Math.ceil(value), round: () => Math.round(value)
    };
    if (!functions[name]) throw new Error(`Unknown function: ${name}()`);
    const result = functions[name]();
    if (Number.isNaN(result)) throw new Error(`${name}() is not defined for that value.`);
    return result;
}

function calculate(addToHistory = true) {
    const expression = $("#expression").value.trim();
    const conversionIntent = parseConversionIntent(expression);
    if (conversionIntent) {
        launchConversion(conversionIntent);
        return null;
    }
    const loanIntent = parseLoanIntent(expression);
    if (loanIntent) {
        launchLoan(loanIntent);
        return null;
    }
    try {
        const value = evaluateExpression(expression);
        currentValue = value;
        lastAnswer = value;
        hasResult = true;
        $("#result").textContent = mode === "programmer" ? formatBase(value, numberBase) : formatNumber(value);
        $("#error-message").textContent = "";
        $("#display-hint").textContent = mode === "programmer" ? `32-bit bitwise operations · ${numberBaseLabel(numberBase)}` : "Ready for your next calculation";
        if (addToHistory && expression) addHistory(expression, value);
        renderBases(value);
        return value;
    } catch (error) {
        $("#error-message").textContent = error.message;
        hasResult = false;
        return null;
    }
}

function preview() {
    const source = $("#expression").value.trim();
    if (!source) { $("#result").textContent = "0"; return; }
    if (parseConversionIntent(source) || parseLoanIntent(source)) return;
    try {
        const value = evaluateExpression(source);
        $("#result").textContent = mode === "programmer" ? formatBase(value, numberBase) : formatNumber(value);
        if (mode === "programmer") renderBases(value);
    } catch { /* Stay quiet while the user is still typing. */ }
}

function addHistory(expression, value) {
    history.unshift({ expression, value, time: Date.now() });
    history = history.slice(0, 100);
    saveHistory();
    renderHistory();
}

function renderHistory() {
    const list = $("#history-list");
    $("#history-count").textContent = history.length;
    if (!history.length) {
        list.innerHTML = '<div class="empty-history"><span class="empty-icon">∑</span><p>Your calculations will show up here.</p><span>Results are saved on this device.</span></div>';
        return;
    }
    list.replaceChildren(...history.map((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";
        button.dataset.historyIndex = index;
        const expression = document.createElement("span");
        expression.className = "history-expression";
        expression.textContent = item.expression;
        const result = document.createElement("strong");
        result.className = "history-result";
        result.textContent = formatNumber(item.value);
        const time = document.createElement("span");
        time.className = "history-time";
        time.textContent = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        button.append(expression, result, time);
        return button;
    }));
}

function formatBase(value, base) {
    if (!Number.isFinite(value)) return "—";
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) return "Integer required";
    return BigInt(value).toString(base).toUpperCase();
}

function numberBaseLabel(base) { return ({ 2: "binary", 8: "octal", 10: "decimal", 16: "hexadecimal" })[base]; }

function renderBases(value = currentValue) {
    if (mode !== "programmer") return;
    const readouts = $("#base-readouts");
    readouts.replaceChildren(...[[16, "HEX"], [10, "DEC"], [8, "OCT"], [2, "BIN"]].map(([base, label]) => {
        const row = document.createElement("div");
        row.className = "base-readout";
        const caption = document.createElement("span"); caption.textContent = label;
        const output = document.createElement("strong"); output.textContent = formatBase(value, base);
        row.append(caption, output);
        return row;
    }));
}

function setMode(nextMode) {
    mode = nextMode;
    $$(".mode-tab").forEach((tab) => {
        const active = tab.dataset.mode === mode;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", String(active));
    });
    const calculator = mode === "standard" || mode === "scientific" || mode === "programmer";
    $("#calculator-panel").hidden = !calculator;
    $("#calculator-panel").dataset.mode = mode;
    $("#convert-panel").hidden = mode !== "convert";
    $("#business-panel").hidden = mode !== "business";
    $("#graph-panel").hidden = mode !== "graph";
    $("#formula-panel").hidden = mode !== "formulas";
    $("#scientific-keys").hidden = mode !== "scientific";
    $("#programmer-keys").hidden = mode !== "programmer";
    $("#angle-control").hidden = mode !== "scientific";
    $("#mode-indicator").textContent = mode.toUpperCase();
    if (mode === "formulas") {
        document.title = "Formula library | Calcwork";
        $("#page-heading").textContent = "Formula library";
        $("#page-description").content = "Search and calculate useful finance, physics, everyday, and statistics formulas.";
    } else if (mode === "graph") {
        document.title = "Function grapher | Calcwork";
        $("#page-heading").textContent = "Graph a function";
    } else {
        document.title = "Calcwork | Precision calculator";
        $("#page-heading").textContent = DEFAULT_PAGE_HEADING;
        $("#page-description").content = "A precise, private calculator for everyday, scientific, business, and programming work.";
    }
    $("#display-hint").textContent = mode === "programmer" ? `32-bit bitwise operations · ${numberBaseLabel(numberBase)}` : "Enter an expression or use the keypad";
    updateProgrammerKeys();
    if (mode === "programmer") renderBases();
    if (calculator) $("#expression").focus();
    else if (mode === "convert") $("#conversion-value").focus();
    else if (mode === "business") $("#business-form input")?.focus();
    else if (mode === "formulas") $("#formula-search").focus();
    else if (mode === "graph") { drawGraph(); $("#graph-fn").focus(); }
}

function parseConversionIntent(query) {
    const normalizedQuery = query.trim().replace(/^(?:convert|change)\s+/i, "");
    const match = normalizedQuery.match(/^\s*(-?(?:\d+(?:\.\d*)?|\.\d+)\s*)?(.+?)\s+(?:to|into)\s+(.+?)\s*$/i);
    if (!match) return null;
    const aliases = {
        meter: ["length", "meter"], meters: ["length", "meter"], metre: ["length", "meter"], metres: ["length", "meter"], m: ["length", "meter"],
        kilometer: ["length", "kilometer"], kilometers: ["length", "kilometer"], kilometre: ["length", "kilometer"], kilometres: ["length", "kilometer"], km: ["length", "kilometer"],
        centimeter: ["length", "centimeter"], centimeters: ["length", "centimeter"], cm: ["length", "centimeter"],
        millimeter: ["length", "millimeter"], millimeters: ["length", "millimeter"], mm: ["length", "millimeter"],
        mile: ["length", "mile"], miles: ["length", "mile"], mi: ["length", "mile"], yard: ["length", "yard"], yards: ["length", "yard"], yd: ["length", "yard"], yds: ["length", "yard"],
        foot: ["length", "foot"], feet: ["length", "foot"], ft: ["length", "foot"], inch: ["length", "inch"], inches: ["length", "inch"], in: ["length", "inch"],
        kilogram: ["mass", "kilogram"], kilograms: ["mass", "kilogram"], kg: ["mass", "kilogram"], gram: ["mass", "gram"], grams: ["mass", "gram"], g: ["mass", "gram"],
        pound: ["mass", "pound"], pounds: ["mass", "pound"], lb: ["mass", "pound"], lbs: ["mass", "pound"], ounce: ["mass", "ounce"], ounces: ["mass", "ounce"], oz: ["mass", "ounce"], tonne: ["mass", "tonne"], tonnes: ["mass", "tonne"],
        liter: ["volume", "liter"], liters: ["volume", "liter"], litre: ["volume", "liter"], litres: ["volume", "liter"], l: ["volume", "liter"], milliliter: ["volume", "milliliter"], milliliters: ["volume", "milliliter"], ml: ["volume", "milliliter"],
        "cubic meter": ["volume", "cubicmeter"], "cubic meters": ["volume", "cubicmeter"], "cubic metre": ["volume", "cubicmeter"], "cubic metres": ["volume", "cubicmeter"], "m3": ["volume", "cubicmeter"], gallon: ["volume", "gallon"], gallons: ["volume", "gallon"], "us gallon": ["volume", "gallon"], quart: ["volume", "quart"], quarts: ["volume", "quart"], cup: ["volume", "cup"], cups: ["volume", "cup"],
        celsius: ["temperature", "celsius"], centigrade: ["temperature", "celsius"], fahrenheit: ["temperature", "fahrenheit"], kelvin: ["temperature", "kelvin"],
        second: ["time", "second"], seconds: ["time", "second"], sec: ["time", "second"], secs: ["time", "second"], hour: ["time", "hour"], hours: ["time", "hour"], hr: ["time", "hour"], minute: ["time", "minute"], minutes: ["time", "minute"], min: ["time", "minute"], day: ["time", "day"], days: ["time", "day"], week: ["time", "week"], weeks: ["time", "week"],
        mph: ["speed", "mph"], "miles per hour": ["speed", "mph"], "mi/h": ["speed", "mph"], kph: ["speed", "kph"], "kilometers per hour": ["speed", "kph"], "kilometres per hour": ["speed", "kph"], "km/h": ["speed", "kph"], "meters per second": ["speed", "mps"], "metres per second": ["speed", "mps"], "m/s": ["speed", "mps"], knot: ["speed", "knot"], knots: ["speed", "knot"],
        "square meter": ["area", "sqm"], "square meters": ["area", "sqm"], "square metre": ["area", "sqm"], "square metres": ["area", "sqm"], "sq m": ["area", "sqm"], sqm: ["area", "sqm"], "m2": ["area", "sqm"],
        "square foot": ["area", "sqft"], "square feet": ["area", "sqft"], sqft: ["area", "sqft"], "sq ft": ["area", "sqft"], hectare: ["area", "hectare"], hectares: ["area", "hectare"], acre: ["area", "acre"], acres: ["area", "acre"],
        byte: ["data", "byte"], bytes: ["data", "byte"], kb: ["data", "kilobyte"], kilobyte: ["data", "kilobyte"], kilobytes: ["data", "kilobyte"], mb: ["data", "megabyte"], megabyte: ["data", "megabyte"], megabytes: ["data", "megabyte"], gb: ["data", "gigabyte"], gigabyte: ["data", "gigabyte"], gigabytes: ["data", "gigabyte"], kib: ["data", "kibibyte"], kibibyte: ["data", "kibibyte"], mib: ["data", "mebibyte"], mebibyte: ["data", "mebibyte"], gib: ["data", "gibibyte"], gibibyte: ["data", "gibibyte"]
    };
    const clean = (unit) => unit.trim().toLowerCase().replace(/[?.!,]+$/, "");
    const from = aliases[clean(match[2])];
    const to = aliases[clean(match[3])];
    if (!from || !to || from[0] !== to[0]) return null;
    return { category: from[0], from: from[1], to: to[1], value: match[1] ? Number(match[1]) : 1 };
}

function parseLoanIntent(query) {
    if (!/\b(home loan|mortgage|loan calculator|mortgage calculator)\b/i.test(query)) return null;
    const numbers = query.match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => Number(value.replaceAll(",", ""))) || [];
    return { amount: numbers[0], rate: numbers[1], years: numbers[2] };
}

function launchConversion(intent) {
    setMode("convert");
    $("#conversion-category").value = intent.category;
    populateUnits();
    $("#conversion-from").value = intent.from;
    $("#conversion-to").value = intent.to;
    $("#conversion-value").value = intent.value;
    $("#expression").value = "";
    const fromName = units[intent.category][intent.from][0];
    const toName = units[intent.category][intent.to][0];
    $("#page-heading").textContent = `${fromName} to ${toName.toLowerCase()}`;
    document.title = `${fromName} to ${toName.toLowerCase()} converter | Calcwork`;
    $("#page-description").content = `Convert ${fromName.toLowerCase()} to ${toName.toLowerCase()} instantly with the Calcwork unit converter.`;
    updateConversion();
}

function launchLoan(params) {
    setMode("business");
    businessMode = "loan";
    $$(".business-tab").forEach((tab) => {
        const active = tab.dataset.business === businessMode;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
    });
    businessFields();
    const inputs = Object.fromEntries([...$("#business-form").querySelectorAll("input")].map((input) => [input.name, input]));
    if (params.amount !== undefined) inputs.principal.value = params.amount;
    if (params.rate !== undefined) inputs.apr.value = params.rate;
    if (params.years !== undefined) inputs.years.value = params.years;
    if (params.currency && ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "CHF"].includes(params.currency.toUpperCase())) {
        currencyCode = params.currency.toUpperCase();
        $("#business-currency").value = currencyCode;
    }
    Object.values(inputs).forEach((input) => input.dispatchEvent(new Event("input", { bubbles: true })));
    updateBusiness();
    inputs.principal.focus();
    $("#expression").value = "";
    $("#page-heading").textContent = "Home loan calculator";
    document.title = "Home loan calculator | Calcwork";
    $("#page-description").content = "Estimate monthly home-loan payments, total interest, and repayment cost.";
}

function launchFromUrl() {
    const params = new URLSearchParams(location.search);
    const query = params.get("q") || params.get("query") || "";
    const tool = (params.get("tool") || "").toLowerCase();
    const conversion = parseConversionIntent(query);
    const hasUnitPair = params.has("from") && params.has("to");
    if (conversion || tool === "convert" || hasUnitPair) {
        if (conversion) {
            if (params.has("value") && Number.isFinite(Number(params.get("value")))) conversion.value = Number(params.get("value"));
            launchConversion(conversion);
        } else {
            const fromIntent = parseConversionIntent(`${params.get("value") || "1"} ${params.get("from") || ""} to ${params.get("to") || ""}`);
            if (fromIntent) launchConversion(fromIntent);
            else if (tool === "convert") setMode("convert");
        }
        return;
    }
    const loanIntent = parseLoanIntent(query);
    if (tool === "loan" || loanIntent) {
        launchLoan({
            ...loanIntent,
            amount: params.get("amount") ?? loanIntent?.amount,
            rate: params.get("rate") ?? loanIntent?.rate,
            years: params.get("years") ?? loanIntent?.years,
            currency: params.get("currency") || undefined
        });
        return;
    }
    if (tool === "formula" || tool === "formulas") {
        setMode("formulas");
        return;
    }
    if (query) {
        $("#expression").value = query;
        $("#expression").focus();
        if (/^[\d\s()+\-*/.^%!]+$/.test(query)) calculate();
    }
}

function updateProgrammerKeys() {
    const programmer = mode === "programmer";
    $$("[data-digit]").forEach((button) => { button.disabled = programmer && Number(button.dataset.digit) >= numberBase; });
    $$("[data-decimal]").forEach((button) => { button.disabled = programmer; });
    $$("[data-base-digit]").forEach((button) => { button.hidden = !programmer || Number(button.dataset.baseDigit) >= numberBase; });
}

function insertText(text) {
    const input = $("#expression");
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const value = input.value;
    input.value = value.slice(0, start) + text + value.slice(end);
    const cursor = start + text.length;
    input.focus();
    input.setSelectionRange(cursor, cursor);
    $("#error-message").textContent = "";
    preview();
}

function handleAction(action) {
    const input = $("#expression");
    if (action === "clear" || action === "clear-entry") {
        if (action === "clear-entry" && input.value.trim()) {
            input.value = input.value.replace(/(?:\d+(?:\.\d*)?|\.\d+|[a-zA-Z]+|\([^()]*\))\s*$/, "");
            input.focus();
            return;
        }
        input.value = "";
        currentValue = 0;
        hasResult = false;
        $("#result").textContent = "0";
        $("#error-message").textContent = "";
        $("#display-hint").textContent = "Enter an expression or use the keypad";
        renderBases(0);
    } else if (action === "backspace") {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        if (start !== end) input.setRangeText("", start, end, "end");
        else if (start > 0) input.setRangeText("", start - 1, start, "end");
        input.focus();
        preview();
    } else if (action === "evaluate") calculate();
    else if (action === "sign") {
        if (input.value.trim()) input.value = `-(${input.value})`;
        else insertText("-");
        input.focus();
    } else if (action === "copy") {
        if ($("#expression").value.trim()) calculate(false);
        if (hasResult && navigator.clipboard) navigator.clipboard.writeText(String(currentValue)).then(() => {
            $("#display-hint").textContent = "Result copied to clipboard";
        }).catch(() => { $("#display-hint").textContent = "Clipboard access is unavailable"; });
    } else if (action === "memory-clear") {
        memoryValue = 0;
        $("#memory-status").textContent = "M cleared";
    } else if (action === "memory-store") {
        if ($("#expression").value.trim() && calculate(false) === null) return;
        memoryValue = currentValue;
        $("#memory-status").textContent = `M ${formatNumber(memoryValue)}`;
    } else if (action === "memory-recall") {
        insertText("Mem");
    } else if (action === "memory-add" || action === "memory-subtract") {
        if ($("#expression").value.trim() && calculate(false) === null) return;
        memoryValue += action === "memory-add" ? currentValue : -currentValue;
        $("#memory-status").textContent = `M ${formatNumber(memoryValue)}`;
    }
}

function populateUnits() {
    const category = $("#conversion-category").value;
    const options = Object.entries(units[category]).map(([value, unit]) => {
        const option = document.createElement("option"); option.value = value; option.textContent = unit[0]; return option;
    });
    $("#conversion-from").replaceChildren(...options.map((option) => option.cloneNode(true)));
    $("#conversion-to").replaceChildren(...options.map((option) => option.cloneNode(true)));
    if (options.length > 1) $("#conversion-to").selectedIndex = 1;
    updateConversion();
}

function updateConversion() {
    const category = $("#conversion-category").value;
    const value = Number($("#conversion-value").value);
    const from = $("#conversion-from").value;
    const to = $("#conversion-to").value;
    let converted;
    if (category === "temperature") {
        const celsius = from === "celsius" ? value : from === "fahrenheit" ? (value - 32) * 5 / 9 : value - 273.15;
        converted = to === "celsius" ? celsius : to === "fahrenheit" ? celsius * 9 / 5 + 32 : celsius + 273.15;
    } else {
        converted = value * units[category][from][1] / units[category][to][1];
    }
    $("#conversion-result").textContent = Number.isFinite(converted) ? formatNumber(converted, 10) : "—";
    $("#conversion-note").textContent = category === "data" ? "Decimal units use powers of 1000; binary units use powers of 1024." : "Conversions are calculated at full precision; displayed values are rounded for readability.";
}

function businessFields() {
    const forms = {
        percent: [['Amount', 'amount', '1000'], ['Percentage', 'rate', '15']],
        discount: [['Original price', 'amount', '120'], ['Discount', 'rate', '20']],
        tax: [['Price before tax', 'amount', '100'], ['Tax rate', 'rate', '8.25']],
        margin: [['Cost', 'cost', '60'], ['Selling price', 'price', '100']],
        tip: [['Bill amount', 'amount', '86.40'], ['Tip (%)', 'rate', '18'], ['People', 'people', '2']],
        date: [['From', 'from', new Date().toISOString().slice(0, 10), 'date'], ['To', 'to', new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), 'date']],
        age: [['Date of birth', 'dob', '1995-06-15', 'date']],
        loan: [['Loan amount', 'principal', '250000'], ['Annual interest rate (%)', 'apr', '6.5'], ['Term (years)', 'years', '30']]
    };
    const form = $("#business-form");
    form.replaceChildren(...forms[businessMode].map(([label, name, value, type]) => {
        const wrapper = document.createElement("label"); wrapper.className = "field-label"; wrapper.textContent = label.toUpperCase();
        const input = document.createElement("input"); input.className = "field-input"; input.name = name; input.type = type || "number"; if (!type) { input.step = "any"; input.inputMode = "decimal"; } input.value = value;
        wrapper.append(input); return wrapper;
    }));
    $(".currency-field").hidden = businessMode === "date" || businessMode === "age";
    form.querySelectorAll("input").forEach((input) => input.addEventListener("input", updateBusiness));
    updateBusiness();
}

function updateBusiness() {
    const values = Object.fromEntries([...$("#business-form").querySelectorAll("input")].map((input) => [input.name, input.type === "date" ? input.value : Number(input.value)]));
    const result = $("#business-result");
    let label; let primary; let detail;
    if (businessMode === "percent") {
        const amount = values.amount * values.rate / 100;
        label = `${formatNumber(values.rate)}% of ${formatCurrency(values.amount)}`; primary = formatCurrency(amount); detail = `Original amount plus percentage: ${formatCurrency(values.amount + amount)}`;
    } else if (businessMode === "discount") {
        const saving = values.amount * values.rate / 100;
        label = "PRICE AFTER DISCOUNT"; primary = formatCurrency(values.amount - saving); detail = `You save ${formatCurrency(saving)} (${formatNumber(values.rate)}%)`;
    } else if (businessMode === "tax") {
        const tax = values.amount * values.rate / 100;
        label = `TOTAL WITH ${formatNumber(values.rate)}% TAX`; primary = formatCurrency(values.amount + tax); detail = `Tax amount: ${formatCurrency(tax)}`;
    } else if (businessMode === "margin") {
        const profit = values.price - values.cost;
        const margin = values.price === 0 ? NaN : profit / values.price * 100;
        const markup = values.cost === 0 ? NaN : profit / values.cost * 100;
        label = "GROSS MARGIN"; primary = Number.isFinite(margin) ? `${formatNumber(margin, 2)}%` : "—"; detail = `Profit ${formatCurrency(profit)} · Markup ${Number.isFinite(markup) ? `${formatNumber(markup, 2)}%` : "—"}`;
    } else if (businessMode === "tip") {
        const tip = values.amount * values.rate / 100;
        const people = Math.max(1, Math.floor(values.people) || 1);
        label = "EACH PERSON PAYS"; primary = formatCurrency((values.amount + tip) / people); detail = `Tip ${formatCurrency(tip)} · Total ${formatCurrency(values.amount + tip)} · ${people} ${people === 1 ? "person" : "people"}`;
    } else if (businessMode === "date") {
        const days = Math.round((new Date(values.to) - new Date(values.from)) / 864e5);
        label = "DIFFERENCE"; primary = Number.isFinite(days) ? `${formatNumber(Math.abs(days))} days` : "Pick two dates";
        detail = Number.isFinite(days) ? `${formatNumber(Math.abs(days) / 7, 2)} weeks · ${days < 0 ? "the second date is earlier" : "counting forward"}` : "";
    } else if (businessMode === "age") {
        const born = new Date(`${values.dob}T00:00`); const now = new Date();
        label = "AGE TODAY";
        if (Number.isNaN(born.getTime()) || born > now) { primary = "Pick a past date"; detail = ""; }
        else {
            let y = now.getFullYear() - born.getFullYear(); let m = now.getMonth() - born.getMonth(); let d = now.getDate() - born.getDate();
            if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
            if (m < 0) { y--; m += 12; }
            primary = `${y} years, ${m} months, ${d} days`; detail = `${formatNumber(Math.floor((now - born) / 864e5))} days lived`;
        }
    } else {
        const payments = values.years * 12;
        const monthlyRate = values.apr / 1200;
        const monthlyPayment = payments > 0 && monthlyRate >= 0
            ? values.principal >= 0 ? monthlyRate === 0 ? values.principal / payments : values.principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -payments)) : NaN
            : NaN;
        const total = monthlyPayment * payments;
        label = "ESTIMATED MONTHLY PAYMENT";
        primary = Number.isFinite(monthlyPayment) ? formatCurrency(monthlyPayment) : "Check your inputs";
        detail = Number.isFinite(total) ? `Total paid ${formatCurrency(total)} · Interest ${formatCurrency(total - values.principal)} · ${payments} payments. Excludes taxes, insurance, and fees.` : "Enter a non-negative amount and rate with a positive term.";
    }
    result.replaceChildren();
    const caption = document.createElement("span"); caption.textContent = label;
    const amount = document.createElement("strong"); amount.textContent = primary;
    const supporting = document.createElement("small"); supporting.textContent = detail;
    result.append(caption, amount, supporting);
}

function renderFormulaList() {
    const query = $("#formula-search").value.trim().toLowerCase();
    const category = $("#formula-category").value;
    const matches = formulas.filter((formula) => {
        const searchable = `${formula.name} ${formula.category} ${formula.keywords}`.toLowerCase();
        return (category === "all" || formula.category === category) && (!query || searchable.includes(query));
    });
    const list = $("#formula-list");
    if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "formula-empty";
        empty.textContent = "No formulas match. Try another search.";
        list.replaceChildren(empty);
        $("#formula-detail").hidden = true;
        return;
    }
    $("#formula-detail").hidden = false;
    if (!matches.some((formula) => formula.id === selectedFormulaId)) {
        selectFormula(matches[0].id);
        return;
    }
    list.replaceChildren(...matches.map((formula) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "formula-list-item";
        button.classList.toggle("active", formula.id === selectedFormulaId);
        button.setAttribute("aria-current", String(formula.id === selectedFormulaId));
        const name = document.createElement("strong"); name.textContent = formula.name;
        const categoryLabel = document.createElement("span"); categoryLabel.textContent = formula.category;
        button.append(name, categoryLabel);
        button.addEventListener("click", () => selectFormula(formula.id));
        return button;
    }));
}

function selectFormula(id) {
    const formula = formulas.find((entry) => entry.id === id);
    if (!formula) return;
    selectedFormulaId = id;
    $("#formula-category-label").textContent = formula.category.toUpperCase();
    $("#formula-name").textContent = formula.name;
    $("#formula-description").textContent = formula.description;
    $("#formula-equation").textContent = formula.equation;
    $("#formula-fields").replaceChildren(...formula.fields.map(([name, label, value]) => {
        const wrapper = document.createElement("label"); wrapper.className = "field-label"; wrapper.textContent = label.toUpperCase();
        const input = document.createElement("input"); input.className = "field-input"; input.name = name; input.type = "number"; input.step = "any"; input.value = value; input.inputMode = "decimal";
        wrapper.append(input);
        input.addEventListener("input", updateFormulaResult);
        return wrapper;
    }));
    renderFormulaList();
    updateFormulaResult();
}

function updateFormulaResult() {
    const formula = formulas.find((entry) => entry.id === selectedFormulaId);
    if (!formula) return;
    const values = Object.fromEntries([...$("#formula-fields").querySelectorAll("input")].map((input) => [input.name, Number(input.value)]));
    selectedFormulaResult = formula.calculate(values);
    const result = $("#formula-result");
    result.replaceChildren();
    const label = document.createElement("span"); label.textContent = "RESULT";
    const value = document.createElement("strong"); value.textContent = selectedFormulaResult.display;
    const detail = document.createElement("small"); detail.textContent = selectedFormulaResult.detail;
    result.append(label, value, detail);
    $("#formula-use").disabled = !Number.isFinite(selectedFormulaResult.value);
}

function drawGraph() {
    const canvas = $("#graph-canvas"); const box = canvas.getBoundingClientRect();
    if (!box.width) return;
    const dpr = window.devicePixelRatio || 1; const W = box.width; const H = box.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext("2d"); g.scale(dpr, dpr);
    const css = getComputedStyle(document.body); const color = (name) => css.getPropertyValue(name).trim();
    const sx = (x) => W / 2 + (x - graph.cx) * graph.scale; const sy = (y) => H / 2 - (y - graph.cy) * graph.scale;
    const step = Math.pow(10, Math.ceil(Math.log10(30 / graph.scale)));
    g.font = "10px 'DM Mono', monospace"; g.fillStyle = color("--muted");
    for (let k = Math.ceil((graph.cx - W / 2 / graph.scale) / step); k * step <= graph.cx + W / 2 / graph.scale; k++) {
        const px = sx(k * step); g.strokeStyle = color("--line"); g.lineWidth = 1; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke();
        if (k !== 0) g.fillText(formatNumber(k * step, 6), px + 3, Math.min(H - 4, Math.max(12, sy(0) + 12)));
    }
    for (let k = Math.ceil((graph.cy - H / 2 / graph.scale) / step); k * step <= graph.cy + H / 2 / graph.scale; k++) {
        const py = sy(k * step); g.strokeStyle = color("--line"); g.lineWidth = 1; g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.stroke();
        if (k !== 0) g.fillText(formatNumber(k * step, 6), Math.min(W - 36, Math.max(4, sx(0) + 4)), py - 3);
    }
    g.strokeStyle = color("--muted"); g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx(0), 0); g.lineTo(sx(0), H); g.moveTo(0, sy(0)); g.lineTo(W, sy(0)); g.stroke();
    const source = $("#graph-fn").value.trim(); const note = $("#graph-note");
    if (!source) { note.textContent = "Type a function of x to plot it."; return; }
    const savedAngle = angle; angle = "RAD";
    g.strokeStyle = color("--blue"); g.lineWidth = 2; g.beginPath();
    let pen = false; let lastY = 0; let plotted = 0; let failure = "";
    for (let px = 0; px <= W; px++) {
        let y = NaN; xValue = graph.cx + (px - W / 2) / graph.scale;
        try { y = evaluateExpression(source); } catch (error) { failure = error.message; }
        const py = sy(y);
        if (!Number.isFinite(y) || Math.abs(py) > 1e5) { pen = false; continue; }
        if (pen && Math.abs(py - lastY) < H * 1.5) g.lineTo(px, py); else g.moveTo(px, py);
        pen = true; lastY = py; plotted++;
    }
    g.stroke(); xValue = null; angle = savedAngle;
    note.textContent = plotted ? "Angles are in radians on the graph. Use x as the variable, for example 2x + 1 or sin(x)/x." : (failure || "Nothing to plot in this view.");
}

function zoomGraph(factor) { graph.scale = Math.min(2000, Math.max(2, graph.scale * factor)); drawGraph(); }

function initialize() {
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        if (settings.theme === "dark" || (!settings.theme && matchMedia("(prefers-color-scheme: dark)").matches)) document.body.classList.add("dark-theme");
        if (settings.angle === "RAD") angle = "RAD";
        if (["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "CHF"].includes(settings.currency)) currencyCode = settings.currency;
    } catch { /* Use defaults if settings cannot be read. */ }
    $("#theme-icon").textContent = document.body.classList.contains("dark-theme") ? "☼" : "◐";
    $$(".angle-option").forEach((button) => {
        const active = button.dataset.angle === angle;
        button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
    });
    $("#footer-year").textContent = new Date().getFullYear();
    renderHistory();
    populateUnits();
    businessFields();
    renderFormulaList();
    selectFormula(selectedFormulaId);

    $$(".mode-tab").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
    $$("[data-insert]").forEach((button) => button.addEventListener("click", () => insertText(button.dataset.insert)));
    $$("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action)));
    $$(".angle-option").forEach((button) => button.addEventListener("click", () => {
        angle = button.dataset.angle;
        $$(".angle-option").forEach((option) => { const active = option === button; option.classList.toggle("active", active); option.setAttribute("aria-pressed", String(active)); });
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ angle, currency: currencyCode, theme: document.body.classList.contains("dark-theme") ? "dark" : "light" })); } catch { /* Ignore unavailable storage. */ }
        if ($("#expression").value) calculate(false);
    }));
    $$(".base-option").forEach((button) => button.addEventListener("click", () => {
        numberBase = Number(button.dataset.base);
        $$(".base-option").forEach((option) => { const active = option === button; option.classList.toggle("active", active); option.setAttribute("aria-pressed", String(active)); });
        $("#display-hint").textContent = `32-bit bitwise operations · ${numberBaseLabel(numberBase)}`;
        updateProgrammerKeys();
        renderBases();
    }));
    $$(".business-tab").forEach((button) => button.addEventListener("click", () => {
        businessMode = button.dataset.business;
        $$(".business-tab").forEach((tab) => { const active = tab === button; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
        businessFields();
    }));
    $("#conversion-category").addEventListener("change", populateUnits);
    $("#business-currency").value = currencyCode;
    $("#business-currency").addEventListener("change", (event) => {
        currencyCode = event.target.value;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ angle, currency: currencyCode, theme: document.body.classList.contains("dark-theme") ? "dark" : "light" })); } catch { /* Ignore unavailable storage. */ }
        updateBusiness();
    });
    $("#formula-search").addEventListener("input", renderFormulaList);
    $("#formula-category").addEventListener("change", renderFormulaList);
    $("#formula-use").addEventListener("click", () => {
        if (!selectedFormulaResult || !Number.isFinite(selectedFormulaResult.value)) return;
        const expression = selectedFormulaResult.expression;
        setMode("standard");
        $("#expression").value = expression;
        calculate();
    });
    ["#conversion-value", "#conversion-from", "#conversion-to"].forEach((selector) => $(selector).addEventListener("input", updateConversion));
    ["#conversion-from", "#conversion-to"].forEach((selector) => $(selector).addEventListener("change", updateConversion));
    $("#swap-units").addEventListener("click", () => {
        const from = $("#conversion-from"); const to = $("#conversion-to");
        [from.value, to.value] = [to.value, from.value]; updateConversion();
    });
    $("#expression").addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); calculate(); }
        else if (event.key === "Escape") handleAction("clear");
    });
    $("#expression").addEventListener("input", () => { $("#error-message").textContent = ""; });
    $("#history-list").addEventListener("click", (event) => {
        const item = event.target.closest("[data-history-index]");
        if (!item) return;
        const entry = history[Number(item.dataset.historyIndex)];
        if (entry) { setMode("standard"); $("#expression").value = entry.expression; calculate(false); }
    });
    $("#clear-history").addEventListener("click", () => { history = []; saveHistory(); renderHistory(); });
    $("#export-history").addEventListener("click", () => {
        if (!history.length) return;
        const rows = [["Expression", "Result", "Calculated at"], ...history.map((item) => [item.expression, item.value, new Date(item.time).toISOString()])];
        const csv = rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(",")).join("\r\n");
        const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "calcwork-history.csv"; link.click(); URL.revokeObjectURL(link.href);
    });
    $("#theme-toggle").addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
        $("#theme-icon").textContent = document.body.classList.contains("dark-theme") ? "☼" : "◐";
        drawGraph();
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ angle, currency: currencyCode, theme: document.body.classList.contains("dark-theme") ? "dark" : "light" })); } catch { /* Ignore unavailable storage. */ }
    });
    const canvas = $("#graph-canvas"); let drag = null;
    canvas.addEventListener("pointerdown", (event) => { drag = { x: event.clientX, y: event.clientY, cx: graph.cx, cy: graph.cy }; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", (event) => { if (!drag) return; graph.cx = drag.cx - (event.clientX - drag.x) / graph.scale; graph.cy = drag.cy + (event.clientY - drag.y) / graph.scale; drawGraph(); });
    canvas.addEventListener("pointerup", () => { drag = null; });
    canvas.addEventListener("wheel", (event) => { event.preventDefault(); zoomGraph(event.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    $("#graph-fn").addEventListener("input", drawGraph);
    $("#graph-zoom-in").addEventListener("click", () => zoomGraph(1.3));
    $("#graph-zoom-out").addEventListener("click", () => zoomGraph(1 / 1.3));
    $("#graph-reset").addEventListener("click", () => { Object.assign(graph, { cx: 0, cy: 0, scale: 40 }); drawGraph(); });
    window.addEventListener("resize", drawGraph);
    $("#expression").addEventListener("input", preview);
    if (matchMedia("(pointer: coarse)").matches) $("#expression").inputMode = "none";
    $("#kbd-toggle").addEventListener("click", () => { const input = $("#expression"); input.inputMode = input.inputMode === "none" ? "text" : "none"; input.focus(); });
    $("#expression").focus({ preventScroll: true });
    launchFromUrl();
}

initialize();