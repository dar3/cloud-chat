
provider "aws" {
  region = "us-east-1"
}

data "aws_elastic_beanstalk_solution_stack" "dotnet8" {
  most_recent = true
  name_regex  = "^64bit Amazon Linux 2023 (.*) running .NET 8$"
}


data "aws_elastic_beanstalk_solution_stack" "docker" {
  most_recent = true
  name_regex  = "^64bit Amazon Linux 2023 (.*) running Docker$"
}


resource "aws_s3_bucket" "chat_files_bucket" {
  bucket        = "chat-app-files-bucket-${random_id.bucket_id.hex}"
  force_destroy = true 

  tags = {
    Name        = "ChatAppFilesBucket"
    Environment = "Dev"
  }
}

resource "random_id" "bucket_id" {
  byte_length = 4
}



resource "aws_db_instance" "chat_database" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.t3.medium" 
  db_name              = "ChatAppDb"
  username             = "dbadmin"
  # that's not real password, just a placeholder for labs/demos - in production will use secrets manager
  password             = "password123" 
  parameter_group_name = "default.postgres16"
  skip_final_snapshot  = true #  for easy teardown in labs
  publicly_accessible  = true # easier local development connecting to RDS

  tags = {
    Name = "ChatAppDatabase"
  }
}


resource "aws_cloudwatch_log_group" "chat_app_log_group" {
  name              = "/aws/elasticbeanstalk/chat-app-logs"
  retention_in_days = 7

  tags = {
    Application = "ChatApp"
  }
}


resource "aws_elastic_beanstalk_application" "chat_app" {
  name        = "GroupChatApplication"
  description = "Application containing Backend and Frontend environments"
}

# Backend Environment (C# ASP.NET Core)
resource "aws_elastic_beanstalk_environment" "backend_env" {
  name                = "chat-backend-env"
  application         = aws_elastic_beanstalk_application.chat_app.name

 
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.docker.name


  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "LabInstanceProfile" 
  }

setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_S3_BUCKET_NAME"
    value     = aws_s3_bucket.chat_files_bucket.bucket
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DB_CONNECTION_STRING"
    value     = "Host=${aws_db_instance.chat_database.endpoint};Database=${aws_db_instance.chat_database.db_name};Username=${aws_db_instance.chat_database.username};Password=${aws_db_instance.chat_database.password}"
  }
}

# Frontend Environment (Docker)
resource "aws_elastic_beanstalk_environment" "frontend_env" {
  name                = "chat-frontend-env"
  application         = aws_elastic_beanstalk_application.chat_app.name

  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.docker.name

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "LabInstanceProfile"
  }

# Pass the Backend URL to the Frontend so it knows where to send API requests
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "API_URL"
    value     = "http://${aws_elastic_beanstalk_environment.backend_env.cname}/api"
  }
}

# Outputs to easily retrieve the generated URLs
output "backend_url" {
  value       = aws_elastic_beanstalk_environment.backend_env.cname
  description = "The URL of the Backend environment"
}

output "frontend_url" {
  value       = aws_elastic_beanstalk_environment.frontend_env.cname
  description = "The URL of the Frontend environment"
}

output "database_endpoint" {
  value       = aws_db_instance.chat_database.endpoint
  description = "The endpoint of the RDS Database"
}