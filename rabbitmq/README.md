# Productor y consumidor con RabbitMQ

Recreación del tutorial oficial [«Hello World!» en Python](https://www.rabbitmq.com/tutorials/tutorial-one-python), con RabbitMQ en la imagen oficial de Docker. `send.py` y `receive.py` son los del tutorial, sin cambios. Este ejemplo no forma parte de la aplicación de cartas.

El informe con las pruebas y sus capturas está en [docs/rabbitmq-productor-consumidor.md](../docs/rabbitmq-productor-consumidor.md) (también en [Word](../docs/rabbitmq-productor-consumidor.docx)).

## Requisitos

- Docker.
- Python 3.10 o superior (se probó con 3.14.7).

## Uso

Desde esta carpeta, en PowerShell:

```powershell
docker run -d --hostname my-rabbit --name rabbitmq-tutorial -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672 rabbitmq:4.4-management
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Espera a que `docker logs rabbitmq-tutorial` diga `Server startup complete`. No uses `docker exec` antes de ese mensaje: el CLI de Erlang, ejecutado como `root`, crearía una cookie que el servidor no puede leer, y el nodo se detendría.

Terminal 1, el consumidor (Ctrl+C para salir):

```powershell
python receive.py
```

Terminal 2, el productor y la cola:

```powershell
python send.py
docker exec rabbitmq-tutorial rabbitmqctl list_queues
```

La interfaz de gestión queda en `http://127.0.0.1:15672` (usuario y contraseña `guest`). Los puertos solo se publican en `127.0.0.1`.

## Limpieza

```powershell
docker stop rabbitmq-tutorial
docker rm -v rabbitmq-tutorial
```
