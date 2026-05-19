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
        echo 'Scan de sécurité de l image avec Trivy...'
        sh '''
          # Lancer uniquement le service trivy via son profil
          docker-compose --profile scan run --rm trivy
        '''
      }
    }

    stage('Lancer l environnement de test') {
      steps {
        echo 'Nettoyage des anciens conteneurs...'
        sh 'docker-compose down --remove-orphans'

        echo 'Libération forcée des ports 3000 et 80...'
        sh '''
          for PORT in 3000 80; do
            CONTAINER=$(docker ps --filter "publish=${PORT}" -q)
            if [ -n "$CONTAINER" ]; then
              echo "Port ${PORT} occupé par $CONTAINER, arrêt forcé..."
              docker stop $CONTAINER || true
              docker rm $CONTAINER  || true
            else
              echo "Port ${PORT} libre."
            fi
          done
        '''

        echo 'Démarrage de tous les services...'
        sh 'docker-compose up -d'

        echo 'Attente que le backend soit healthy...'
        sh '''
          for i in $(seq 1 24); do
            HEALTH=$(docker inspect --format="{{.State.Health.Status}}" \
              $(docker-compose ps -q backend) 2>/dev/null || echo "unknown")
            echo "Tentative $i/24 - Backend status: $HEALTH"

            if [ "$HEALTH" = "healthy" ]; then
              echo "Backend healthy et prêt !"
              exit 0
            fi

            if [ "$HEALTH" = "unhealthy" ]; then
              echo "=== Backend unhealthy ! Affichage des logs ==="
              docker-compose logs --tail=80 backend
              exit 1
            fi

            sleep 5
          done

          echo "=== Timeout : backend pas prêt après 120s. Logs ==="
          docker-compose logs --tail=80 backend
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
          sh 'docker-compose down'
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
      echo 'Pipeline réussi ! Image saine et tests passés.'
    }
    failure {
      echo 'Le pipeline a échoué. Vérifiez les logs.'
      sh 'docker-compose down --remove-orphans'
    }
    always {
      sh 'docker image prune -f'
    }
  }
}
