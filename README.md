# arb.js

ArbJS (will be renamed to Shad-Monitor) is the project that can do swap calculations and follows LP changes in protocols.

Using continues monitoring of pool amounts ArbJS (Shad-Monitor) calculates the so called "capacity" between different DEX pairs (which are hardcoded).

The end result is that ArbJS uploads each pairs capacity between 2 DEX's (osmosis and shade right now)

Those uploaded results are used by arb-shadbot to execute them and capture the arbitrage capacity.
