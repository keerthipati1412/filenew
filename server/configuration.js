const path = require("path");
const app_root = path.dirname(__dirname); 

module.exports = {
    
    PORT:  5000,

   
    HISTORY_DIR:  path.join(app_root, "server-data"),

    
    WEBROOT:  path.join(app_root, "client-data"),

    
    SAVE_INTERVAL:  1000 * 2, 


    MAX_SAVE_DELAY:  1000 * 60, 

   
    MAX_ITEM_COUNT: 32768,

   
    MAX_CHILDREN:  192,

   
    MAX_BOARD_SIZE:  65536,

    
    MAX_EMIT_COUNT:  192,

    
    MAX_EMIT_COUNT_PERIOD:  4096,

    
};
