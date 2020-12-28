const Promise = require('bluebird');

/**
 * @param {Object}              [query={}]
 * @param {Object}              [options={}]
 * @param {Object|String}         [options.select]
 * @param {Object|String}         [options.sort]
 * @param {Array|Object|String}   [options.populate]
 * @param {Boolean}               [options.lean=false]
 * @param {Boolean}               [options.leanWithId=true]
 * @param {Number}                [options.offset=0] - Use offset or page to set skip position
 * @param {Number}                [options.page=1]
 * @param {Number}                [options.limit=10]
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
function paginate (query, options, callback) {

  query = query || {};
  options = Object.assign({}, paginate.options, options);

  const select = options.select;
  const sort = options.sort;
  const populate = options.populate;
  const lean = options.lean || false;
  const leanWithId = ('leanWithId' in options) ? options.leanWithId : true;

  const limit = ('limit' in options) ? options.limit : 10;
  let skip,
    offset,
    page;

  if ('offset' in options) {

    offset = options.offset;
    skip = offset;

  } else if ('page' in options) {

    page = options.page;
    skip = (page - 1) * limit;

  } else {

    offset = 0;
    page = 1;
    skip = offset;

  }

  const promises = {
    docs: Promise.resolve([]),
    count: this.countDocuments(query).exec()
  };

  if (limit) {

    const q = this.find(query)
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(lean);

    if (populate) {

      [].concat(populate).forEach((item) => {

        q.populate(item);

      });

    }

    promises.docs = q.exec();

    if (lean && leanWithId) {

      promises.docs = promises.docs.then((docs) => {

        docs.forEach((doc) => {

          doc.id = String(doc._id);

        });

        return docs;

      });

    }

  }

  return Promise.props(promises)
    .then((data) => {

      const result = {
        docs: data.docs,
        total: data.count,
        limit
      };

      if (offset !== undefined) {

        result.offset = offset;

      }

      if (page !== undefined) {

        result.page = page;
        result.pages = Math.ceil(data.count / limit) || 1;

      }

      return result;

    })
    .asCallback(callback);

}

/**
 * @param {Schema} schema
 */
module.exports = function paginateFunc (schema) {

  schema.statics.paginate = paginate;

};

module.exports.paginate = paginate;
