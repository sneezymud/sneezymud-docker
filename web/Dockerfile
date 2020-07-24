FROM python:3.6
ARG UID=1000
ADD . /code
WORKDIR /code
RUN pip install -r requirements.txt
RUN useradd -ms /bin/bash -u $UID sneezy
USER sneezy
CMD python main.py
