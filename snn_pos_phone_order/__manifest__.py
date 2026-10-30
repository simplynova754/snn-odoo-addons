{
    "name": "Simply Nova - Phone Orders",
    "version": "18.0.1.4.1",
    "summary": "Phone order panel for the POS: customer name, phone, pickup time and payment mode",
    "author": "Simply Nova LLC",
    "category": "Sales/Point of Sale",
    "license": "LGPL-3",
    "depends": ["point_of_sale"],
    "data": [
        "views/pos_config_view.xml",
        "views/pos_order_view.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "snn_pos_phone_order/static/src/**/*",
        ],
    },
    "installable": True,
    "application": False,
}
