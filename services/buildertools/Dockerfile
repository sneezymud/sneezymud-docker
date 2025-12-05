FROM python:3-slim
ARG UID=1000
COPY . /code
WORKDIR /code
RUN chown -R 1000 /code
RUN pip install -r requirements.txt
RUN useradd -ms /bin/bash -u $UID sneezy
USER sneezy
CMD ["python", "main.py"]
