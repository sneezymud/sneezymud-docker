echo 'gitdir: ../.git/modules/sneezymud' > sneezymud/.git
docker build -t sneezy docker || exit /b 1
docker run -it --rm -v %cd%:/home/sneezy/sneezymud-docker sneezy
