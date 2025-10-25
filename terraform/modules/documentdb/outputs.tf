output "cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "cluster_id" {
  value = aws_docdb_cluster.main.id
}

output "port" {
  value = aws_docdb_cluster.main.port
}
