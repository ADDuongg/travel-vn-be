<!-- # ==========================================================

# RESTORE MONGO DATABASE TỪ FILE DUMP VÀO CONTAINER STAGING

# ==========================================================

#

# docker exec

# -> Chạy command bên trong container đang chạy

#

# backend-staging-mongo

# -> Tên container MongoDB staging

#

# mongorestore

# -> Tool của MongoDB dùng để restore dữ liệu từ thư mục dump

# (được tạo ra từ mongodump)

#

# ==========================================================

docker exec backend-staging-mongo mongorestore \

# --username duongnv

# -> Username MongoDB để đăng nhập

# -> User này phải có quyền restore database

# -> Thường là root/admin user

--username duongnv \

# --password 'Duong@88999'

# -> Password của user ở trên

# -> Dùng dấu nháy đơn để shell không hiểu sai ký tự đặc biệt (@)

--password 'Duong@88999' \

# --authenticationDatabase admin

# -> Database chứa user account để xác thực

# -> User root thường nằm trong DB admin

#

# Nghĩa là:

# Login user duongnv tại DB admin

# rồi mới restore sang DB khác

--authenticationDatabase admin \

# --drop

# -> Trước khi restore collection nào,

# xóa collection cũ cùng tên trong DB đích

#

# Ví dụ:

# hotels đã tồn tại -> drop hotels -> restore lại hotels mới

#

# Dùng khi muốn dữ liệu sạch, giống hệt file backup

--drop \

# --db travel-vn

# -> Database đích sẽ restore vào

#

# Toàn bộ dữ liệu dump sẽ được đưa vào DB:

# travel-vn

#

# Nếu DB chưa tồn tại -> Mongo tự tạo

--db travel-vn \

# /tmp/travel-vn

# -> Đường dẫn thư mục dump nằm bên trong container

#

# Thường bên trong sẽ có dạng:

#

# /tmp/travel-vn/

# hotels.bson

# users.bson

# users.metadata.json

#

# Đây là dữ liệu đã được docker cp vào container trước đó

/tmp/travel-vn -->

docker exec backend-staging-mongo mongorestore \
 --username duongnv \
 --password 'Duong@88999' \
 --authenticationDatabase admin \
 --drop \
 --db travel-vn \
 /tmp/travel-vn

<!-- copy thư mục db vào dump folder -->

docker cp /opt/travel-be/staging/travel-vn backend-staging-mongo:/tmp/travel-vn

<!-- copy folder database mongo to vps -->

scp -r e-commerce user@VPS_IP:/opt/travel-be/staging/

<!-- ssh tunnel cho mongo do không expose port -->

ssh -N -L 27117:127.0.0.1:27017 username@vps_id
