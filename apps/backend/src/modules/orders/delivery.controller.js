import DeliveryZone from './deliveryZone.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';

export const getDeliveryZones = catchAsync(async (req, res) => {
    // Explicit projection rather than whole documents. This list is read on
    // every checkout render and only these five fields are ever displayed;
    // createdAt/updatedAt/__v are dead weight on the wire.
    const zones = await DeliveryZone.find({ isActive: true }).select(
        'name fee etaDays codAllowed isActive',
    );
    res.json({ success: true, data: zones });
});

export const createDeliveryZone = catchAsync(async (req, res) => {
    const zone = await DeliveryZone.create(req.body);
    res.status(201).json({ success: true, data: zone });
});

export const updateDeliveryZone = catchAsync(async (req, res, next) => {
    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!zone) return next(new AppError('Delivery zone not found', 404));
    res.json({ success: true, data: zone });
});

/**
 * DELETE /api/v1/delivery-zones/:id — removes a zone entirely.
 *
 * Safe as a hard delete, and worth being explicit about why: an Order stores
 * `shipping.zoneName` as a plain string snapshot taken at checkout, not a
 * reference to this document. Deleting a zone therefore cannot break how any
 * existing order displays, and there is nothing to cascade or orphan.
 *
 * The in-flight case is the only real hazard: a customer who added the zone to
 * their cart but has not yet placed the order would find their checkout total
 * change underneath them. Deactivating (PATCH isActive: false) is the gentler
 * option for a zone that is merely out of service, which is what most of these
 * really are.
 */
export const deleteDeliveryZone = catchAsync(async (req, res, next) => {
    const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
    if (!zone) return next(new AppError('Delivery zone not found', 404));
    res.status(204).json({ success: true, data: null });
});