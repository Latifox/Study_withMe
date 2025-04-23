# PowerShell script to run SonarQube analysis locally

# Configuration variables - modify as needed
$SONAR_HOST_URL = "http://localhost:9000"  # Default SonarQube server URL
$SONAR_TOKEN = ""  # Add your SonarQube token here or leave empty to enter it at runtime

# If no token is provided, ask for it
if ([string]::IsNullOrEmpty($SONAR_TOKEN)) {
    $SONAR_TOKEN = Read-Host -Prompt "Enter your SonarQube token (leave empty for anonymous)"
}

# Generate coverage report
Write-Host "Generating coverage report..."
npm run test:coverage

# Run SonarQube scanner
Write-Host "Running SonarQube analysis..."
if ([string]::IsNullOrEmpty($SONAR_TOKEN)) {
    # Run without authentication if no token provided
    sonar-scanner.bat -Dsonar.host.url=$SONAR_HOST_URL
} else {
    # Run with authentication token
    sonar-scanner.bat -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.login=$SONAR_TOKEN
}

Write-Host "SonarQube analysis complete. View results at $SONAR_HOST_URL" 