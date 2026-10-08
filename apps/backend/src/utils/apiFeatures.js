// The most a client may ask for in one page. Without a ceiling,
// GET /api/v1/products?limit=1000000 is a public endpoint that will happily
// load the entire catalogue, run three facet aggregations and serialise
// everything into one response.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// A hard ceiling on how far into a collection a client may page. Beyond this
// MongoDB is walking documents only to discard them, and offset pagination
// gets slower the deeper you go, so there is no upside to allowing it.
const MAX_SKIP = 10_000;

/**
 * Wraps a Mongoose query and applies filter/sort/pagination from
 * query-string parameters. One implementation, reused by any list
 * endpoint (products, orders), instead of each controller writing its
 * own version of the same three pieces of logic.
 */
export class ApiFeatures {
    constructor(query, queryParams) {
        this.query = query; // a Mongoose query, e.g. Product.find()
        this.queryParams = queryParams; // req.safeQuery
    }

    filter() {
        // An ALLOW-list, not a deny-list. Both list endpoints build their real
        // filters themselves — buildProductFilter() for size/colour/brand,
        // baseFilter for the admin order status/search — so this pass-through
        // only ever forwarded parameters nobody reads.
        //
        // That made it the whole NoSQL-injection surface: any unrecognised
        // query parameter, including `?$where=...`, was spread straight into
        // Product.find(). Naming the fields that are actually safe closes it.
        // `isActive` is deliberately NOT in here: the catalogue builds it
        // itself, and forwarding it let ?isActive=false overwrite the
        // active-only filter and publish deactivated products.
        const allowed = new Set(['status', 'role', 'user', 'category', 'contact.email']);
        const filters = {};
        for (const [key, value] of Object.entries(this.queryParams ?? {})) {
            if (allowed.has(key)) filters[key] = value;
        }

        if (Object.keys(filters).length) this.query = this.query.find(filters);
        return this;
    }

    sort() {
        let sortBy;
        if (this.queryParams?.sort) {
            // "?sort=price,-createdAt" becomes "price -createdAt" for Mongoose
            sortBy = String(this.queryParams.sort)
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean)
                .join(' ');
            if (!sortBy) sortBy = '-createdAt';
        } else {
            sortBy = '-createdAt';
        }

        // A sort field is a path handed to MongoDB, so "$natural" and
        // "meta.password" have no business being here. Any token carrying an
        // operator character is dropped rather than passed through.
        const tokens = sortBy.split(/\s+/).filter((token) => token && !/[.$]/.test(token));
        if (!tokens.length) tokens.push('-createdAt');

        // Always break ties on _id. createdAt is NOT unique here - the seed
        // data puts up to 11 products in the same millisecond - so without a
        // unique tiebreaker MongoDB may return the same product on two pages
        // and silently drop another, which made the admin table show 78 of
        // 80 products with no way to reach the missing two.
        const fields = tokens.map((token) => token.replace(/^[+-]/, ''));
        if (!fields.includes('_id')) tokens.push('_id');

        this.query = this.query.sort(tokens.join(' '));
        return this;
    }

    paginate() {
        const requested = Number(this.queryParams?.limit);
        const limit = Math.min(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_LIMIT, MAX_LIMIT);

        const requestedPage = Number(this.queryParams?.page);
        const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

        // page * limit is clamped too: ?page=999999999 would otherwise skip
        // past the end of a 100-item limit and ask MongoDB to walk the whole
        // collection before returning nothing.
        const skip = Math.min((page - 1) * limit, MAX_SKIP);

        this.query = this.query.skip(skip).limit(limit);
        this.limit = limit;
        this.page = page;
        return this;
    }
}