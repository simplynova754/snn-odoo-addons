# snn-odoo-addons

Custom Odoo 18 Community modules for Simply Nova NYC.

| Module | What it does |
| --- | --- |
| `snn_pos_phone_order` | Phone order panel on the POS register: customer name, phone, pickup time and payment mode. Writes a "PHONE ORDER" line into the order note so it prints on the receipt and kitchen ticket. Turn it on per register: Point of Sale → Configuration → Point of Sales → Phone order panel. |

## Install on the server

First time only:

```
cd /tmp && git clone https://github.com/simplynova754/snn-odoo-addons.git snn
```

Every update:

```
cd /tmp/snn
git pull
sh deploy.sh
```

Then in Odoo: Apps → Update Apps List → install (first time) or Upgrade (after changes).
