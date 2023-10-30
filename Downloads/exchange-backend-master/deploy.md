# Ubuntu
```bash
sudo apt update
```

### Time
```bash
timedatectl set-timezone Asia/Ho_Chi_Minh
```

### Mở port

```bash
sudo ufw allow OpenSSH
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 2096/tcp
sudo ufw allow 2087/tcp
sudo ufw allow 2083/tcp
sudo ufw allow 2053/tcp
sudo ufw allow 8888/tcp
sudo ufw allow 8443/tcp
sudo ufw allow 3306/tcp
sudo ufw enable
sudo ufw reload

sudo apt install mysql-server
sudo mysql_secure_installation
```

Select:
Y - 2
- Nhập pass (1)
Y
Y
N
Y
Y

### Thêm user với quyền root để truy cập từ ngoài vào
```bash
mysql -u root -p
Nhập pass vừa nãy (1)

CREATE USER 'username'@'localhost' IDENTIFIED BY 'FCL#Y6qhxfGqLc5afk!SQPP';
ALTER USER 'username'@'localhost' IDENTIFIED WITH mysql_native_password BY 'FCL#Y6qhxfGqLc5afk!SQPP';
CREATE USER 'username'@'%' IDENTIFIED BY 'FCL#Y6qhxfGqLc5afk!SQPP';

GRANT ALL ON *.* TO 'username'@'localhost';
GRANT ALL ON *.* TO 'username'@'%';

sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Lúc này các bạn sẽ thấy bind-address có địa chỉ đang là 127.0.0.1.Theo mặc định, sql cài xong sẽ chỉ được allow trên localhost, nếu muốn remote chúng, thì bạn cần sửa lại thành 0.0.0.0 như sau

```
bind-address		= 0.0.0.0
mysqlx-bind-address	= 0.0.0.0
```

```bash
sudo systemctl restart mysql
```

### Install node JS

```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -

sudo apt -y install nodejs
```

### Import DB

sanbovip

### Install nginx

```bash
sudo apt install nginx
sudo ufw allow 'Nginx HTTP'
systemctl status nginx
```

Copy file to default nginx folder

File `/etc/nginx/sites-available/default`

```nginx
server {
    client_max_body_size 25M;

    server_name panazic.com www.panazic.com;

    location /home/src/public/ {
        expires 30d;
        access_log on;
    }

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
nginx -t
service nginx reload
```

# Centos 7

```bash
yum update
timedatectl set-timezone Asia/Ho_Chi_Minh
sudo yum install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo systemctl status mariadb
sudo mysql_secure_installation
mysql -u root -p
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'FCL#Y6qhxfGqLc5afk!SQPP' WITH GRANT OPTION;

sudo firewall-cmd --permanent --zone=public --add-service=http 
sudo firewall-cmd --permanent --zone=public --add-service=https
firewall-cmd --zone=public --add-port=2096/tcp --permanent
firewall-cmd --zone=public --add-port=2087/tcp --permanent
firewall-cmd --zone=public --add-port=2083/tcp --permanent
firewall-cmd --zone=public --add-port=2053/tcp --permanent
firewall-cmd --zone=public --add-port=8888/tcp --permanent
firewall-cmd --zone=public --add-port=8443/tcp --permanent
firewall-cmd --zone=public --add-port=3306/tcp --permanent
firewall-cmd --reload

sudo yum install unzip
curl -sL https://rpm.nodesource.com/setup_14.x | bash -
sudo yum install -y nodejs
sudo npm install pm2 -g
sudo pm2 startup systemd

sudo yum install epel-release
sudo yum install nginx
sudo systemctl start nginx
sudo systemctl status nginx

echo '' > /root/.bash_history
```

File `nginx.conf`

```nginx
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 768;
	# multi_accept on;
}

http {

	##
	# Basic Settings
	##

	sendfile on;
	tcp_nopush on;
	tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;
	# server_tokens off;

	# server_names_hash_bucket_size 64;
	# server_name_in_redirect off;

	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	##
	# SSL Settings
	##

	ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
	ssl_prefer_server_ciphers on;

	##
	# Logging Settings
	##

	access_log /var/log/nginx/access.log;
	error_log /var/log/nginx/error.log;

	##
	# Gzip Settings
	##

	gzip on;

	# gzip_vary on;
	# gzip_proxied any;
	# gzip_comp_level 6;
	# gzip_buffers 16 8k;
	# gzip_http_version 1.1;
	# gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

	##
	# Virtual Host Configs
	##

	include /etc/nginx/conf.d/*.conf;
	include /etc/nginx/sites-enabled/*;
}


#mail {
#	# See sample authentication script at:
#	# http://wiki.nginx.org/ImapAuthenticateWithApachePhpScript
# 
#	# auth_http localhost/auth.php;
#	# pop3_capabilities "TOP" "USER";
#	# imap_capabilities "IMAP4rev1" "UIDPLUS";
# 
#	server {
#		listen     localhost:110;
#		protocol   pop3;
#		proxy      on;
#	}
# 
#	server {
#		listen     localhost:143;
#		protocol   imap;
#		proxy      on;
#	}
#}
```

File: `sites-enabled/default`

```nginx
server {
    client_max_body_size 25M;

    server_name binomo.pro www.binomo.pro;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
setsebool -P httpd_can_network_connect on
systemctl restart nginx
```
