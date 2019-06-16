declare module 'mongoose-cachebox' {
  import { Mongoose } from 'mongoose';
  interface ICacheboxOptions {
    cache?: boolean;
    /**
     * Time for cache to live in seconds.
     */
    ttl?: number;
  }
  function mongooseCachebox(mongoose: Mongoose, opts: ICacheboxOptions): void;
  export = mongooseCachebox;
}
