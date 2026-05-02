# tree-clean-ascii.ps1 - Fixed version with ASCII
$output = "project_structure_clean.txt"

# Папки и файлы, которые нужно полностью игнорировать
$excludeDirs = @(
    "__pycache__", 
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".next",
    ".venv",
    "venv",
    ".pytest_cache",
    "*.egg-info",
    ".eggs",
    "*.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".env.local",
    ".env.development.local",
    ".env.test.local",
    ".env.production.local",
    "*.tsbuildinfo",
    ".DS_Store",
    "*.pid",
    "*.seed",
    ".yarn",
    ".pnp"
)

# Папки, которые показываем, но не рекурсивно (только 1 уровень)
$shallowDirs = @(
    "node_modules",
    "dist"
)

function Get-CleanTree {
    param(
        [string]$path = ".",
        [string]$indent = "",
        [int]$depth = 0
    )
    
    $lines = @()
    
    try {
        $items = Get-ChildItem $path -ErrorAction SilentlyContinue | 
                 Where-Object { 
                     $item = $_
                     
                     # Автоматически исключаем все __pycache__ и .pyc файлы
                     if ($item.Name -eq "__pycache__" -or $item.Name -like "*.pyc") {
                         return $false
                     }
                     
                     # Пропускаем исключаемые папки
                     foreach ($pattern in $excludeDirs) {
                         if ($pattern -like "*.*" -and $item.Name -like $pattern) {
                             return $false
                         }
                         elseif ($item.Name -eq $pattern) {
                             return $false
                         }
                     }
                     
                     # Пропускаем временные файлы редакторов
                     if ($item.Name -match '^\..*\.swp$' -or 
                         $item.Name -match '^~.*' -or
                         $item.Name -match '^\._.*') {
                         return $false
                     }
                     
                     return $true
                 } |
                 Sort-Object { $_.PSIsContainer -eq $false }, Name
                 
        $count = $items.Count
        $i = 0
        
        foreach ($item in $items) {
            $i++
            $isLast = ($i -eq $count)
            
            if ($isLast) {
                $branch = "+-- "
                $nextIndent = $indent + "    "
            } else {
                $branch = "|-- "
                $nextIndent = $indent + "|   "
            }
            
            if ($item.PSIsContainer) {
                if ($item.Name -in $shallowDirs) {
                    # Показываем папку, но не рекурсивно
                    $lines += "$indent$branch[$($item.Name)]/"
                } else {
                    $lines += "$indent$branch[$($item.Name)]/"
                    # Ограничиваем глубину рекурсии
                    if ($depth -lt 6) {
                        $lines += Get-CleanTree -path $item.FullName -indent $nextIndent -depth ($depth + 1)
                    }
                }
            } else {
                # Показываем только важные файлы
                $ext = [System.IO.Path]::GetExtension($item.Name).ToLower()
                
                # Важные расширения файлов
                $importantExtensions = @('.py', '.js', '.ts', '.jsx', '.tsx', '.vue', '.html', 
                                        '.css', '.scss', '.json', '.yml', '.yaml', '.toml', 
                                        '.ini', '.cfg', '.conf', '.md', '.txt', '.sql', 
                                        '.sh', '.bat', '.ps1', '.dockerfile')
                
                # Важные конфиг-файлы
                $configFiles = @('.env', '.gitignore', '.dockerignore', 'Makefile', 
                                'docker-compose.yml', 'requirements.txt', 
                                'package.json', 'package-lock.json', 'tsconfig.json',
                                'vite.config.ts', 'alembic.ini', 'README.md', 
                                'uvicorn', 'entrypoint.sh', '.env.example')
                
                if ($ext -in $importantExtensions -or $item.Name -in $configFiles) {
                    $lines += "$indent$branch$($item.Name)"
                }
            }
        }
    }
    catch {
        # Игнорируем ошибки доступа
    }
    
    return $lines
}

# Очистка старого файла
if (Test-Path $output) { 
    # Make sure file is not locked before deleting
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Remove-Item $output -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 100
}

# Создаем новый файл с содержимым
$content = @()

# Заголовок
$content += "========================================"
$content += "PROJECT STRUCTURE (CLEAN)"
$content += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$content += "Path: $(Get-Location)"
$content += "========================================"
$content += ""

# Генерация дерева
$content += Get-CleanTree -path "."

# Запись в файл
$content | Out-File $output -Encoding UTF8

Write-Host "Clean project tree saved to: $output" -ForegroundColor Green
Write-Host "Lines: $((Get-Content $output).Count)" -ForegroundColor Cyan

# Ask before opening notepad
$openFile = Read-Host "Open file in Notepad? (y/n)"
if ($openFile -eq 'y' -or $openFile -eq 'Y') {
    notepad $output
}