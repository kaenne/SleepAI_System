import os

# Настройки для сбора контекста
EXCLUDE_DIRS = {
    'node_modules', '.git', '.expo', 'target', '.venv', 'venv', '__pycache__', 
    'assets', 'build', 'dist', 'maven-status', 'surefire-reports', 'docker', 'docs'
}
INCLUDE_EXTS = {
    '.ts', '.tsx', '.java', '.py', '.yaml', '.yml', '.xml', 
    '.properties', '.json', '.md'
}

# Разделяем проект на логические части
PROJECTS = {
    'sleep-mobile': 'frontend_context.txt',
    'sleep-backend': 'backend_context.txt',
    'sleep-ai': 'ai_context.txt'
}

def generate_context_dumps():
    # Удаляем старый объединенный файл, если он есть
    if os.path.exists('PROJECT_CONTEXT.md'):
        os.remove('PROJECT_CONTEXT.md')
        
    for folder, output_file in PROJECTS.items():
        if os.path.exists(output_file):
            os.remove(output_file)
            
        if not os.path.exists(folder):
            continue
            
        print(f"⏳ Сборка исходного кода {folder} в файл {output_file}...")
        
        with open(output_file, 'w', encoding='utf-8') as out_file:
            out_file.write(f"=== ПОЛНЫЙ ИСХОДНЫЙ КОД: {folder.upper()} ===\n\n")
            
            for root, dirs, files in os.walk(folder):
                # Исключаем ненужные директории прямо во время обхода
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
                
                for file in files:
                    if any(file.endswith(ext) for ext in INCLUDE_EXTS):
                        filepath = os.path.join(root, file)
                        # Пропускаем огромные lock-файлы и сами скрипты
                        if file in ['package-lock.json', 'yarn.lock', 'pom.xml']:
                            continue
                            
                        rel_path = os.path.relpath(filepath, start='.')
                        
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                content = f.read()
                                
                            out_file.write(f"\n{'='*60}\n")
                            out_file.write(f"ФАЙЛ: {rel_path}\n")
                            out_file.write(f"{'='*60}\n\n")
                            out_file.write(content)
                            out_file.write("\n\n")
                            
                        except Exception as e:
                            print(f"⚠️ Пропущен файл {rel_path} (ошибка чтения: {e})")

        file_size = os.path.getsize(output_file) / 1024
        print(f"✅ Успешно сгенерирован: {output_file} (Вес: {file_size:.1f} KB)")

if __name__ == "__main__":
    generate_context_dumps()