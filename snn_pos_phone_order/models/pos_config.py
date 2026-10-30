from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    snn_phone_order_mode = fields.Boolean(
        string="Phone order panel",
        help="Show the phone order panel (name, phone, pickup time, payment mode) on this register.",
    )
    snn_counter_mode = fields.Boolean(
        string="Counter layout",
        help="Walk-in layout: call-out name, top sellers and one-tap Card / Cash / On account buttons.",
    )
    snn_lock_after_sale = fields.Boolean(
        string="Lock after every sale",
        help="Go back to the employee login after each finished sale.",
    )
    snn_time_clock = fields.Boolean(
        string="Time clock on login",
        help="Show the Simply Nova login with clock in, clock out and breaks (Attendances).",
    )
