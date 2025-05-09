echo 'server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}' > /etc/nginx/conf.d/default.conf

nginx -g 'daemon off;'

# Démarre Nginx en mode premier plan, permet de pouvoir refresh stats, navigation, sans probleme 
