# Instalare pe laptopul-server

Ghid pentru Lenovo Legion cu Ubuntu Server. Accesul se face doar prin Tailscale, deci nimic nu e expus pe internet și aplicația nu are nevoie de parolă.

## 1. Ubuntu Server

1. Instalează [Ubuntu Server LTS](https://ubuntu.com/download/server) de pe un stick (Rufus pe Windows). La instalare bifează **OpenSSH server**.
2. Ca laptopul să meargă cu capacul închis:

   ```bash
   sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
   sudo systemctl restart systemd-logind
   ```

3. Bateria rămâne ca un mic UPS. Dacă vrei să o protejezi, limitează încărcarea din BIOS (Lenovo Vantage pe Windows, înainte de formatare: „Conservation mode”).

## 2. Docker și Tailscale

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # apoi ieși și intră din nou în SSH
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Pe iPhone instalează aplicația **Tailscale** și loghează-te cu același cont.

## 3. Aplicația

```bash
git clone https://github.com/LaurentiuALI/Meal-Planner.git ~/meal-planner
cd ~/meal-planner
docker compose up -d --build
```

La prima pornire se creează baza în `~/meal-planner/var/` și se încarcă:
- bucătăria
- ~6000 de produse
- cele 19 rețete prestabilite

La pornirile următoare se aplică doar migrările. Ce ai modificat tu nu e suprascris.

## 4. HTTPS prin Tailscale

```bash
sudo tailscale serve --bg --https=443 http://localhost:3030
tailscale serve status   # îți arată adresa, ex. https://legion.tail1234.ts.net
```

HTTPS-ul e necesar pentru PWA, cameră (scanarea codurilor de bare) și ecranul ținut aprins.

Pe iPhone:
1. Deschide adresa în **Safari**.
2. Apasă Share → **Add to Home Screen**.

Din iconița de pe ecranul principal aplicația merge ca o aplicație normală, inclusiv offline cu ce ai deschis ultima dată.

## 5. Backup nocturn

```bash
crontab -e
# adaugă linia:
0 3 * * * cd ~/meal-planner && docker compose exec -T app node scripts/backup.mjs >> backups/backup.log 2>&1
```

Ultimele 14 copii stau în `~/meal-planner/backups/`. Ca să ajungă și pe PC:
1. Instalează [Syncthing](https://syncthing.net) pe server (`sudo apt install syncthing`, apoi `systemctl --user enable --now syncthing`) și pe PC.
2. Partajează folderul `backups` între cele două.

În plus, din aplicație, Setări → Backup → **Exportă** îți dă oricând un JSON complet. **Importă** îl pune înapoi.

## Actualizare

```bash
cd ~/meal-planner && git pull && docker compose up -d --build
```

## Prețurile Lidl

Se descarcă singure din [fișierul zilnic Lidl](https://www.lidl.ro/c/preturile-la-zi/s10019622) când deschizi lista de cumpărături și au mai mult de o zi. Le poți actualiza și manual, din aceeași pagină.

Fișierul conține prețurile de raft naționale, fără Lidl Plus și fără garanția SGR.
