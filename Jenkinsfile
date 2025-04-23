pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS'
    }
    
    environment {
        NEXUS_URL = 'http://localhost:8081'
        NPM_CONFIG_REGISTRY = "${NEXUS_URL}/repository/npm-group/"
    }
    
    stages {
        stage('SCM Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                powershell 'npm install --legacy-peer-deps'
            }
        }
        
        stage('Lint') {
            steps {
                powershell 'npx eslint "**/*.{ts,tsx}" --report-unused-disable-directives --max-warnings 0'
            }
}
        
        stage('Test') {
            steps {
                powershell 'npm run test'
            }
            post {
                always {
                    junit 'coverage/junit.xml'
                }
            }
        }
        
        stage('Build') {
            steps {
                powershell 'npm run build'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                powershell '''
                    npm run sonar-scanner -- \
                    -Dsonar.projectKey=myLectureSass \
                    -Dsonar.sources=src \
                    -Dsonar.tests=src/tests \
                    -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info
                '''
            }
        }
        
        stage('Upload to Nexus') {
            steps {
                script {
                    def packageJSON = readJSON file: 'package.json'
                    def appVersion = packageJSON.version
                    def appName = packageJSON.name
                    
                    // Create a zip file of the dist directory
                    powershell "Compress-Archive -Path dist -DestinationPath ${appName}-${appVersion}.zip"
                    
                    // Upload to Nexus Repository
                    withCredentials([string(credentialsId: 'nexus-api-key', variable: 'NEXUS_API_KEY')]) {
                        powershell """
                        \$headers = @{
                            'X-NuGet-ApiKey' = '${NEXUS_API_KEY}'
                        }
                        
                        # For raw repositories
                        Invoke-RestMethod -Uri '${NEXUS_URL}/service/rest/v1/components?repository=raw-hosted' -Method Post -Form @{
                            'raw.directory'='${appName}/${appVersion}';
                            'raw.asset1.filename'='${appName}-${appVersion}.zip';
                            'raw.asset1'=Get-Item -Path '${appName}-${appVersion}.zip'
                        } -Headers \$headers
                        """
                    }
                }
            }
        }
        
        stage('Deploy Edge Functions') {
            steps {
                script {
                    powershell '''
                    # Deploy Supabase Edge Functions
                    npx supabase functions deploy --project-ref rvarixstojstceiuezsp
                    '''
                }
            }
        }
        
        stage('Apply Migrations') {
            steps {
                script {
                    powershell '''
                    # Apply Supabase migrations
                    npx supabase migration up --project-ref rvarixstojstceiuezsp
                    '''
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Deploying the application...'
                // Deployment steps will go here
                powershell '''
                # Example deployment command
                # aws s3 sync dist/ s3://your-bucket-name/ --delete
                '''
            }
        }
    }
    
    post {
        failure {
            mail to: 'admin@jenkins.com',
                 subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
                 body: "Something is wrong with the build ${env.BUILD_URL}"
        }
        success {
            echo 'Pipeline completed successfully!'
        }
    }
} 

