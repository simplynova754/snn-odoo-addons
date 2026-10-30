from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    snn_pos_short_name = fields.Char(
        string="Button name",
        help="Short name shown on the POS product button, e.g. 'Norwegian SW'. "
             "Receipts and kitchen tickets keep the full product name.",
    )
    snn_pos_top_seller = fields.Integer(
        string="Top seller slot",
        help="1-6 puts this product in the one-tap top sellers row on the register (in that order). 0 = not shown.",
        default=0,
    )


class ProductProduct(models.Model):
    _inherit = "product.product"

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields_list = super()._load_pos_data_fields(config_id)
        for name in ("snn_pos_short_name", "snn_pos_top_seller"):
            if fields_list and name not in fields_list:
                fields_list.append(name)
        return fields_list
