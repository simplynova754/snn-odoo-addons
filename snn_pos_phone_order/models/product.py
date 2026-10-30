from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    snn_pos_short_name = fields.Char(
        string="Button name",
        help="Short name shown on the POS product button, e.g. 'Norwegian SW'. "
             "Receipts and kitchen tickets keep the full product name.",
    )


class ProductProduct(models.Model):
    _inherit = "product.product"

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields_list = super()._load_pos_data_fields(config_id)
        if fields_list and "snn_pos_short_name" not in fields_list:
            fields_list.append("snn_pos_short_name")
        return fields_list
