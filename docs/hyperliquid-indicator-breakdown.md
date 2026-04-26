# Hyperliquid Momentum Scanner: Indicator Breakdown (One-Page)

This scanner ranks Hyperliquid perpetuals with a **Setup Score (0–100)** composed of five weighted components:

- **Day Change (max 20)**
- **RVOL (max 25)**
- **Acceleration (max 20)**
- **Squeeze Structure (max 20)**
- **Catalyst (max 15)**

Final score:

\[
\text{SetupScore} = S_{day} + S_{rvol} + S_{accel} + S_{squeeze} + S_{cat}
\]

Alert tiers (default): **WATCH ≥ 60**, **ACTIVE_SETUP ≥ 75**, **A_PLUS_SETUP ≥ 85**.

---

## 1) Price Momentum Indicators

### A) 24h Day Change % (used directly + scored)

Math:
\[
\text{dayChangePct} = \frac{\text{markPrice} - \text{prevDayPx}}{\text{prevDayPx}} \times 100
\]

Score mapping (0 to 20):
- < 2% → 0
- ≥ 10% → 20
- else linear: \(\frac{\text{dayChangePct}}{10}\times 20\)

Why it matters for Hyperliquid traders:
- Quickly isolates assets already showing directional intent.
- Helps avoid low-energy markets and focus on names with proven intraday participation.

### B) Short-Horizon Acceleration (15m and 1h)

Raw change math:
\[
\text{change15mPct} = \frac{P_{now}-P_{15m}}{P_{15m}}\times 100
\qquad
\text{change1hPct} = \frac{P_{now}-P_{1h}}{P_{1h}}\times 100
\]

Acceleration score rules (0 to 20):
- if 15m ≤ 0% → 0 immediately
- +5 if 15m ≥ 1%
- +5 if 15m ≥ 2%
- +5 if 1h ≥ 4%
- +5 if 15m > (1h / 2)

Why it matters:
- Distinguishes **stale trend** from **currently accelerating trend**.
- Especially useful for perp execution timing (breakout continuation vs late entry).

---

## 2) Participation / Volume Indicators

### C) Daily RVOL (relative volume)

Implementation approximation:
\[
\text{dailyRvol} \approx \frac{\text{current dayNtlVlm}}{\text{first sampled dayNtlVlm within last 24h window}}
\]

### D) Intraday RVOL (15m burst vs recent baseline)

Using cumulative day notional volume samples:
\[
\text{cur15} = V_{now}-V_{15m}
\]
\[
\text{avg15In1h} = \frac{V_{now}-V_{1h}}{4}
\]
\[
\text{intradayRvol} = \frac{\text{cur15}}{\text{avg15In1h}}
\]

RVOL score (0 to 25):
\[
S_{rvol}=\min\left(\frac{\text{dailyRvol}}{5},1\right)\times12.5 +
\min\left(\frac{\text{intradayRvol}}{5},1\right)\times12.5
\]

Why they matter:
- Confirms whether price move is backed by **real participation**.
- Helps identify when liquidity/interest is expanding fast enough for momentum follow-through.

---

## 3) Market Structure / Execution Risk Indicators

### E) Open Interest (USD)
### F) Spread (bps)
### G) 1% Book Depth (USD)

These feed a **Squeeze Structure** score initialized at 20 and adjusted:

- Open Interest penalty:
  - OI > $500M: −8
  - OI > $200M: −4
- Spread penalty:
  - spread > 20 bps: −8
  - spread > 10 bps: −4
- Depth adjustment:
  - depth < $100k: −8
  - depth < $500k: +3

Then clamp to [0, 20].

Why this is useful on Hyperliquid:
- Adds a practical filter for **tradeability and slippage**.
- Balances squeeze potential vs execution quality so high-score setups are not purely “chart-only”.

---

## 4) Positioning / Event Catalyst Indicators

### H) Funding Rate
### I) Liquidations (1h) *(currently placeholder in engine = 0)*
### J) News Flag *(currently placeholder in engine = false)*

Catalyst score (0 to 15):
- +8 if hasNews
- +4 if liquidationUsd1h > $1M
- +3 if |fundingRate| > 0.0005

Why it matters:
- Captures crowded positioning and event pressure that can fuel sharp perp repricing.
- Even with partial inputs today, framework is ready for richer catalyst ingestion.

---

## 5) Why the Displayed Data Is Actionable

For each asset, the board/detail views expose:
- **Price context**: mark price + 15m/1h/4h/24h changes (direction + momentum slope)
- **Participation context**: daily/intraday RVOL (conviction check)
- **Microstructure context**: spread + depth + OI (can you enter/exit efficiently?)
- **Positioning context**: funding (crowding proxy)
- **Composite decision aid**: weighted breakdown + alert tier

For a Hyperliquid trader, this is useful because it compresses “find momentum + check liquidity + avoid bad execution + prioritize best setups” into a single repeatable ranking process instead of manual symbol-by-symbol scanning.
