/** @odoo-module */
import { Orderline } from "@point_of_sale/app/generic_components/orderline/orderline";

// Allow the add-on breakdown fields on a ticket line. Odoo checks the exact
// shape of a line in debug mode and refuses to draw the ticket otherwise.
const lineProp = Orderline.props.line;
Orderline.props = {
    ...Orderline.props,
    line: {
        ...lineProp,
        shape: {
            ...lineProp.shape,
            snnBasePrice: { type: String, optional: true },
            snnOptions: { type: Array, optional: true },
        },
    },
};
