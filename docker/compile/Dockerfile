FROM sneezy-base:latest
CMD scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 && mkdir -p ../lib/roomdata/saved ../lib/immortals ../lib/corpses/corrupt ../lib/rent/corrupt ../lib/player/corrupt && (for i in a b c d e f g h i j k l m n o p q r s t u v w x y z; do mkdir -p ../lib/rent/$i ../lib/account/$i ../lib/player/$i;done) && cp sneezy_prod.cfg sneezy.cfg
