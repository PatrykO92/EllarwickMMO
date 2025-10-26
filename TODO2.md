# 🧭 Combat System TODO – Focus-Based RPG

## Core Mechanics

- [ ] Rename all posture references → **Focus**
- [ ] Implement Focus system:
  - [ ] `enemy.focus` rośnie od ataków i deflectów
  - [ ] Gdy `enemy.focus >= enemy.maxFocus` → otwórz **Finisher Window (1s)**
  - [ ] Focus regeneruje się, gdy wróg nie jest atakowany (`enemy.focus -= regenRate * dt`)
- [ ] Stałe obrażenia HP:
  - [ ] `damage = max(weaponDamage - enemy.armor, 1)`
  - [ ] Obrażenia niezależne od poziomu
- [ ] Wprowadzić skalowanie różnicy poziomów `Δ = playerLvl - enemyLvl`:
  - [ ] `focusGain *= 1 + 0.1*Δ`
  - [ ] `deflectWindow = ±(110 + 5*Δ)` (clamp 60–160 ms)
  - [ ] `enemy.focusRegen *= 1 - 0.05*Δ`
- [ ] Finisher:
  - [ ] Wykonywany tylko podczas **Focus Break**
  - [ ] Trafienie = natychmiastowe `enemy.hp = 0`

---

## Deflect System

- [ ] Implement perfect-timing window based on level difference
- [ ] Deflect zwiększa `enemy.focus` o `deflectBonus`
- [ ] Dodać efekt wizualny (błysk, dźwięk) dla udanego deflecta

---

## Weapon & Armor

- [ ] Broń ma:
  - [ ] `damage`
  - [ ] `critChance`
  - [ ] `critDamage`
  - [ ] `masteryLevel`
- [ ] Pancerz ma:
  - [ ] `armorValue`
- [ ] Dodać penetrację pancerza jako właściwość broni (opcjonalnie)

---

## Weapon Mastery

- [ ] Zakres: 1–∞
- [ ] Do 100 → szybki rozwój (ok. 400 h łącznego czasu)
- [ ] Powyżej 100 → koszt rośnie kwadratowo (`XP += 2000*(level−100)^2`)
- [ ] Efekt:
  - [ ] `critChance = 5% + max(0, mastery−100)*0.3%`
  - [ ] `critMultiplier = 1.01 + mastery*0.001`

---

## Boss Fights (Co-op 4 Players)

- [ ] Wspólny pasek **Focus**
- [ ] Rytmiczne ataki – kara za spam (reset części Focus)
- [ ] Skalowanie:
  - [ ] `boss.focusRegen *= 1 + 0.25*(players−1)`
  - [ ] `boss.reactionDelay /= 1 + 0.1*(players−1)`
- [ ] Każdy gracz = jeden typ postaci (brak tanków)
- [ ] Mechanika oparta na czytaniu patternów i synchronizacji

---

## Optional Visuals / UX

- [ ] Pasek **Focus** nad przeciwnikiem (kolor zmienia się przy wysokim napięciu)
- [ ] Migający efekt przy Focus Break
- [ ] Pasek **Finisher Window** (1 s)
- [ ] Krótki slow-motion przy udanym deflect
