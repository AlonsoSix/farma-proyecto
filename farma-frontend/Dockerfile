# =====================================================================
#  Frontend - sitio estático servido por Nginx
#  El HTML/CSS/JS no necesita compilación: solo se copia a Nginx.
#  nginx.conf redirige /api al contenedor del backend (mismo origen).
# =====================================================================

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

EXPOSE 80
