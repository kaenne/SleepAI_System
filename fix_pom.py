import re

with open('sleep-backend/pom.xml', 'r') as f:
    content = f.read()

new_content = content.replace('        <!-- Тесты для Security - Исправлена группа -->', '''        <!-- H2 Database for testing -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Тесты для Security - Исправлена группа -->''')

with open('sleep-backend/pom.xml', 'w') as f:
    f.write(new_content)
