# MICRO

Three published connectomes read the price of BTC and ETH as a sensory
stimulus and trade those two markets on Hyperliquid. Each organism starts with
$1,000 of testnet USDC from the faucet, picks its own instrument and its own
side, and trades from its own wallet.

**Profitability is not demonstrated.** See Results below — as of this commit the
organisms are statistically indistinguishable from a coin flip, and one of them
does not trade at all. That is the current finding and it is published as-is.

---

## What is real and what is not

| | Status |
|---|---|
| Connectome wiring | **Real.** Traced from electron microscopy of actual animals, taken from published open datasets. Nothing is invented or sampled. |
| Neural dynamics | **Simulated.** Standard leaky integrate-and-fire. Not a biophysically faithful model of the animal. |
| Sensory encoding | **Engineered.** We choose which price feature drives which neuron population. The animal has no concept of a market. |
| Market prices | **Real.** Hyperliquid public API. |
| Execution | **Paper by default.** Live trading requires `MICRO_LIVE=1` and explicit keys. |
| Learning | **None yet.** There is no reward-driven plasticity in this version. The organisms do not "learn to trade". |

No affiliation with, endorsement by, or technology from any protocol or DAO.
The connectome datasets belong to their authors, cited below.

---

## Connectome provenance

| Organism | Neurons | Source |
|---|---|---|
| *C. elegans* | 302 | White et al. 1986; Cook et al. 2019, *Nature* 571 · doi:10.1038/s41586-019-1352-7 · OpenWorm c302 (MIT) |
| *Ciona intestinalis* larva | 177 (6,618 synapses, 1,206 gap junctions) | Ryan, Lu & Meinertzhagen, *eLife* 5:e16962 (2016) · doi:10.7554/eLife.16962 · CC-BY |
| *Platynereis dumerilii* larva, 3d | 966 (of ~9,000 cells) | Verasztó, Jasek et al., *eLife* (2025) · doi:10.7554/eLife.97964 · data: Zenodo 11811680 |

Drop edge lists as `data/<organism>_edges.csv` with columns `source,target,weight`.
Without them the loader builds a deterministic surrogate graph and flags
`real_connectome: false` everywhere it surfaces — in the API, in the backtest
table, and on the site. Never ship with surrogates silently.

---

## Architecture

```
price feed ──> features ──> sensory currents ──> LIF over connectome
                                                        │
                                          motor spike rates
                                                        │
                            readout weights derived FROM THE WIRING
                                                        │
                                              drive ∈ [-1,1]
                                                        │
                                    threshold ──> LONG / SHORT / FLAT
                                                        │
                            decision written to ledger BEFORE order
                                                        │
                                     risk guards ──> execution
```

The readout is not an arbitrary split of motor neurons. For each motor neuron we
measure two-hop reachability from the attractive versus the aversive sensory
population and use the difference as its weight. This is why swapping the
connectome produces a genuinely different policy rather than a relabelled one.

Drive is normalised by a running RMS of the organism's **own** signal, never
against returns, so performance cannot leak back into the policy.

---

## Gate pipeline

Every decision walks eight gates and **stops at the first failure**, which is
recorded with a reason. A silent organism stops being a mystery:

| Gate | Checks |
|---|---|
| G1 PROVENANCE | wiring is real, not a surrogate |
| G2 ACTIVITY | network fired, and did not run away |
| G3 READOUT | motor readout cleared the threshold |
| G4 EQUITY | equity above the floor, account not locked |
| G5 COOLDOWN | minimum time since last trade |
| G6 RISK | daily loss stop, leverage envelope |
| G7 EXCHANGE | notional above the $10 exchange minimum |
| G8 EXECUTION | order sent, or position correctly held |

Served at `/api/gates`, and each organism's latest run rides along in
`/api/state` under `pipeline`.

Gates are ordered cheapest-first and hard-stop, so an organism running a
surrogate graph never reaches the risk layer at all. `GatePipeline(wall_clock=False)`
disables the cooldown gate for offline backtests, where simulated steps
advance faster than wall time.

## Risk guards

Hyperliquid constraints are enforced in `market/venue.py`:
minimum order value $10 (reduce-only full closes excepted), size rounded down to
`szDecimals`, price limited to 5 significant figures, taker fee 0.045%.

On top of those: max leverage 3x, max notional $150, 15-minute cooldown,
$25 daily loss stop, and a $40 equity floor that switches the account to
reduce-only permanently.

---

## Results (current)

`python backtest.py`, six seeds, 700 decisions each, synthetic GBM with regime
shifts. Returns in percent of starting equity:

```
elegans        mean= -0.91%  std=1.67   runs=[0.0, 0.5, 0.1, -4.5, -1.0, -0.5]
ciona          mean= +0.00%  std=0.00   runs=[0, 0, 0, 0, 0, 0]   <- never trades
platynereis    mean= +0.44%  std=4.39   runs=[3.8, 4.3, 2.1, -8.6, -1.1, 2.0]
random         mean= +1.20%  std=6.22
```

Read this honestly:

- No organism beats the random baseline. Platynereis has the widest variance,
  which is volatility, not skill.
- Ciona never crosses the decision threshold. Its readout is close to
  degenerate at 177 neurons — a real open issue, not a feature.
- These are synthetic prices. Replace `synthetic_prices()` with saved BTC/ETH
  candles before drawing any conclusion at all.

If the numbers stay like this, the site says so. A negative result is publishable.

---

## Run it

```bash
pip install -r requirements.txt
python backtest.py --steps 1500          # offline evaluation
uvicorn api.server:app --port 8000       # worker + API, paper mode
```

`GET /api/state` returns the snapshot the frontend consumes.
`GET /api/sources` returns connectome provenance.
`GET /api/ledger` returns the decision log.

Live trading: set `MICRO_LIVE=1` plus Hyperliquid API wallet credentials.
Do not do this until you have run paper mode for at least two weeks.

---

## Research pass (optional)

`research/` calls a **BioAgents-compatible** research API using its documented
public interface (`/api/chat`, `/api/deep-research`, JWT bearer auth) to turn
each day's decisions into testable hypotheses about the underlying circuits.

```bash
export BIOAGENTS_API_URL=...   # BIOS endpoint, or your own instance
export BIOAGENTS_SECRET=...    # openssl rand -hex 32
python -m research.nightly
```

Results land in `data/hypotheses.jsonl` and are served at `/api/research`.

Two things to be clear about:

- `github.com/bio-xyz/BioAgents` was **archived on 15 June 2026** and is
  read-only; the maintained product is BIOS. It also ships **no LICENSE file**,
  which under default copyright means all rights reserved. We therefore call a
  published HTTP API and **do not vendor, fork or redistribute their code**.
- Without `BIOAGENTS_API_URL` the module is inert. The trading loop never
  depends on it.

The prompt explicitly asks the agent to say when the observed behaviour carries
no biological meaning, rather than manufacture a story. If it keeps answering
that way, that answer gets published too.

## X bot

`social/` posts on events and replies to people who mentioned the account first.

```bash
python -m social.bot            # one pass
python -m social.bot --loop     # continuous, every 5 min
```

**Costs are real.** X has no free tier for new developers since February 2026:
$0.015 per post, **$0.20 per post containing a link**, $0.005 per third-party
read. The client refuses to post links unless explicitly allowed - keep the
site URL in the bio, not in replies. A hard monthly cap (`X_MONTHLY_CAP_USD`,
default $40) stops the bot when hit.

**Posts are event-driven**, not scheduled: opened a position, closed one with
|PnL| above threshold, or stopped at an early gate. A bot posting "still
holding" hourly is noise; one that explains *why nothing happened* is worth
following.

**Replies only go to accounts that mentioned the bot first**, with a one-hour
per-user cooldown and a daily cap. X's automation rules restrict unsolicited
replies, and the cooldown also prevents reply loops with other bots.

**Honesty contract in the prompt.** The connectome outputs a scalar, not
language: text is written by a language model receiving the organism's state
as context. The system prompt forbids claiming the organism thinks, predicts
or knows anything, and refuses price predictions and trading advice. Put the
same disclosure in the account bio.

Every post is signed with the organism it came from. Dry-run is the default -
read the printed output for a few days before setting `X_DRY_RUN=0`.

## Calibration notes

Switching from surrogate graphs to the real connectomes changed the numbers a
lot, and two fixes were needed:

* **Readout scale.** Real connectomes are denser and differently scaled, so a
  fixed gain left the smaller networks permanently below the G3 threshold.
  The drive is now normalised by each organism's own running RMS, which puts
  every network in units of its own typical deviation. Calibrated against
  network activity only, never against returns.
* **Offline cooldown.** Both the gate pipeline and the venue check a
  wall-clock cooldown. In a backtest every step lands in the same real second,
  so everything after the first fill was blocked for the wrong reason. Pass
  `wall_clock=False` to both in offline runs; live and paper keep it on.

**Observed behaviour with real data, stated plainly:** Platynereis (1,638
cells) trades actively and flips direction often. C. elegans and Ciona produce
a strongly autocorrelated readout — they take one directional view and hold it,
often for the whole run. That is what their wiring does under this encoding,
not a bug, and it is why the equity floor gate matters.

## Live execution

`market/live.py` places real orders on Hyperliquid. Off by default.

```bash
pip install hyperliquid-python-sdk --break-system-packages
# .env
MICRO_NETWORK=testnet     # or mainnet
MICRO_LIVE=1
HL_KEY_ELEGANS=0x...      # one wallet per organism
HL_KEY_CIONA=0x...
HL_KEY_PLATYNEREIS=0x...
```

**Why one wallet each.** Every organism gets its own public address, so its
whole history is independently checkable. A site showing its own numbers
proves nothing; a wallet address does. Served at `/api/wallets` and rendered
on the site with explorer links.

**testnet vs mainnet.** Testnet uses faucet USDC (1,000 per address, and the
address must have deposited on mainnet first). Positions are still real and on
chain, viewable in the testnet explorer. **HyperDash indexes mainnet only** —
on testnet that link would 404, so the code omits it rather than showing a
broken one.

**Two rounding rules that reject orders if you get them wrong.** Size must be
rounded DOWN to the asset's `szDecimals`; price must carry at most 5
significant figures. Both are handled in `round_size` and `round_price`.

**Signing.** Order placement signs over a fixed internal chain id on every
network, while transfers and withdrawals sign over the real chain id, which
differs between testnet and mainnet. Mixing them gives `INVALID_SIGNATURE` on
a request that looks correct. The official SDK handles it, which is why this
module uses it instead of signing by hand.

## Reward-modulated plasticity

A three-factor rule: pre-synaptic activity, post-synaptic activity, and a
delayed reward delivered through the organism's **own dopaminergic neurons**.

**The cells are real, and the transmitter differs by species.** Calling all
three "dopaminergic" would be wrong, so each is named for what it actually has:

| Organism | Transmitter | Cells | Source |
|---|---|---|---|
| *C. elegans* | dopamine | CEPDL/DR/VL/VR, ADEL/R, PDEL/R (8) | Sulston 1975; Sawin et al. 2000 |
| *Ciona* larva | dopamine | coronet cells of the sensory vesicle (14) | Razy-Krajka et al. 2012 |
| *Platynereis* larva | **serotonin** | Ser-h1, Ser-tr1 ciliomotor neurons | Verasztó et al. 2017 |

All three are matched by the labels shipped with each dataset, not by guessing.
C. elegans uses exact matching so that MCL and similar names cannot be
mistaken for modulatory cells. Platynereis is **not** matched on MC or Loop —
those are cholinergic, and an earlier version of this module got that wrong.

If the labels are absent the system stays inert for that organism rather than
picking arbitrary neurons and calling them modulatory.

**The reward is engineered.** A worm has no concept of a market. Trading PnL
reaching those cells is our invention, and the site says so.

**Hard constraint: only existing synapses move.** No edge is created, none is
deleted, and each is bounded to ±30% of its published value. The wiring stays
the published wiring; only strengths drift. `/api/plasticity` reports the mean
drift so anyone can see how far from the paper the network has travelled.

An eligibility trace decays at 0.90 per decision, so a reward arriving minutes
after entry still credits roughly the synapses that caused the position.

This may well make performance worse. That is a result too, and it gets
published either way.

## Motivational state

Reward does not just nudge synapses, it shifts a persistent internal state that
governs behaviour for minutes: decision threshold, position size, leverage, and
how long the animal waits before moving again.

Two opposing systems, kept separate rather than collapsed into one signed
number, because an animal can be both hungry and frightened:

| Organism | Appetitive | Aversive | Reward effect | Source |
|---|---|---|---|---|
| *C. elegans* | dopamine | octopamine | **quietens** | Sawin 2000; Suo 2009 |
| *Ciona* larva | dopamine | stress | **quietens** | Razy-Krajka 2012 |
| *Platynereis* larva | serotonin | cholinergic arrest | **excites** | Verasztó 2017 |

**The counterintuitive part is real.** In C. elegans, dopamine released on
encountering food *slows the animal* - the basal slowing response. Success
produces inhibition, not excitement. So after a profitable close the worm
trades **less**, and after a loss it ranges more widely. That is the animal's
documented behaviour, not a trading rule we imposed, and it is the opposite of
what a human usually does after a win.

Platynereis runs the other way: serotonin raises ciliary beating, so reward
speeds it up. Two species that quieten on success, one that accelerates,
facing the same two markets. That contrast is the experiment.

Losses move the state harder than equal-sized wins, and aversive state decays
more slowly than appetitive - so a losing streak lingers.

## The question, measured

`/api/hypothesis` reports performance per organism against neuron count, plus
return and trade count normalised per thousand neurons.

It also carries its own caveat, which stays in the response: three animals,
two markets, one short window, no control for market regime. That is not a
result. It is a public record of what happened so the claim can be checked
instead of asserted.

## A bug worth recording

The first live run reported `mode: live`, showed wallet addresses, drove the
paper accounts to zero — and never sent a single order to the exchange. The
on-chain balances sat untouched at 999 USDC the whole time.

Cause: `market/live.py` was written and loaded, `/api/wallets` returned real
addresses, and `EXECUTOR.enabled` was true, so the API reported live mode. But
nothing ever called `EXECUTOR.submit()`. Gate G8 only ever touched the paper
venue.

The fix wires the executor into G8 and inverts the order of operations: the
real order goes out first, and the paper book is only updated if the exchange
accepted it. A rejection now fails the gate with the exchange's own reason
instead of silently recording a fill that never happened.

Recorded here because a system that claims to be trading live while trading on
paper is the exact failure this project is supposed to make impossible, and it
happened anyway.

## Open problems

1. Ciona does not trade. Readout degeneracy at small N.
2. No plasticity. A reward-modulated rule on existing edges is the obvious
   next step, and the honest framing is "we are trying it", not "it learns".
3. Synthetic prices in the backtest. Needs a real BTC/ETH candle archive.
4. Single instrument means all three can be wrong in the same direction at once.
