from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    snn_phone_order_mode = fields.Boolean(
        string="Phone order panel",
        help="Show the phone order panel (name, phone, pickup time, payment mode) on this register.",
    )
