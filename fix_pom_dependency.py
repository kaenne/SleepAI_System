import re

with open('sleep-backend/pom.xml', 'r') as f:
    content = f.read()

# Make sure we didn't inject a stray <dependency> or syntax error
content = content.replace('''        <dependency>

        <!-- H2 Database for testing -->''', '''        <!-- H2 Database for testing -->''')

with open('sleep-backend/pom.xml', 'w') as f:
    f.write(content)
