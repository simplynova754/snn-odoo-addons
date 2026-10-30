{
    "name": "Simply Nova - Phone Orders",
    "version": "18.0.1.9.0",
    "summary": "Phone order panel for the POS: customer name, phone, pickup time and payment mode",
    "author": "Simply Nova LLC",
    "category": "Sales/Point of Sale",
    "license": "LGPL-3",
    "depends": ["point_of_sale", "account", "pos_hr", "hr_attendance"],
    "data": [
        "views/pos_config_view.xml",
        "views/pos_order_view.xml",
        "views/product_view.xml",
        "views/res_partner_view.xml",
        "views/hr_attendance_view.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "snn_pos_phone_order/static/src/**/*",
        ],
    },
    "installable": True,
    "application": False,
}
