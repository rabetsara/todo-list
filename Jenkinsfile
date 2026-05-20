pipeline {
  agent any

  environment {
    IMAGE_NAME = 'todo-backend'
    IMAGE_TAG  = "${BUILD_NUMBER}"
  }

  stages {

    stage('Récupérer le code') {
      steps {
        echo 'Clonage du dépôt Git...'
        git branch: 'main',
            url: 'https://github.com/rabetsara/todo-list.git'
      }
    }

    stage('Construire l image Docker') {
      steps {
        echo 'Construction de l image Docker du backend...'
        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
        sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
      }
    }

    stage('Scanner l image avec Trivy') {
      steps {
        echo 'Scan de sécurité Trivy...'
        sh 'docker-compose --profile scan run --rm trivy'
      }
      post {
        failure {
          echo '⚠️ Trivy a détecté des vulnérabilités.'
        }
      }
    }

    stage('Lancer l environnement de test') {
      steps {
        sh 'docker-compose down --remove-orphans || true'

        sh '''
          for PORT in 3000 80; do
            CONTAINER=$(docker ps --filter "publish=${PORT}" -q)
            if [ -n "$CONTAINER" ]; then
              docker stop $CONTAINER || true
              docker rm   $CONTAINER || true
            fi
          done
        '''

        sh 'docker-compose up -d'

        // Attendre backend healthy — max 90 secondes
        sh '''
          echo "Attente que le backend soit healthy..."
          for i in $(seq 1 30); do
            STATUS=$(docker inspect --format="{{.State.Health.Status}}" \
              $(docker-compose ps -q backend) 2>/dev/null || echo "unknown")
            echo "Tentative $i/30 - Status: $STATUS"

            if [ "$STATUS" = "healthy" ]; then
              echo "✅ Backend healthy !"
              exit 0
            fi

            if [ "$STATUS" = "unhealthy" ]; then
              echo "❌ Backend unhealthy ! Logs :"
              docker-compose logs --tail=50 backend
              exit 1
            fi

            sleep 3
          done
          echo "❌ Timeout 90s dépassé. Logs :"
          docker-compose logs --tail=50 backend
          exit 1
        '''
      }
    }

    stage('Exécuter les tests') {
      steps {
        sh 'docker-compose exec -T backend node test.js'
      }
      post {
        always {
          sh 'docker-compose down || true'
        }
      }
    }

    stage('Pousser l image sur le registry') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-hub-creds',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
          sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
          sh "docker push ${IMAGE_NAME}:latest"
        }
      }
    }

    stage('Déployer en production') {
      when { branch 'main' }
      steps {
        echo 'Déploiement en production...'
        sh """
          ssh -o StrictHostKeyChecking=no user@mon-serveur.com '
            cd /opt/todo-app &&
            docker-compose down &&
            docker-compose pull &&
            docker-compose up -d
          '
        """
      }
    }

  }

  post {
    success {
      echo '✅ Pipeline réussi ! Image saine et tests passés.'
    }
    failure {
      echo '❌ Le pipeline a échoué. Vérifiez les logs.'
      sh 'docker-compose down --remove-orphans || true'
    }
    always {
      sh 'docker image prune -f'
    }
  }
}
